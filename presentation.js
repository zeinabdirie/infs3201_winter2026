const express = require("express")
const bodyParser = require("body-parser")
const handleBars = require("express-handlebars")
const mongodb = require("mongodb")
const fs = require("fs")
const path = require("path")
const persistence = require("./persistence")
const emailSystem = require("./emailSystem")

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set("views", __dirname + "/templates")
app.set("view engine", "handlebars")
app.engine("handlebars", handleBars.engine({
    helpers: {
        eq: function(a, b) {
            return a === b
        }
    }
}))

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

/**
 * Generates a random 6-digit numeric code for 2FA
 * 
 * @returns {string} 6-digit code as string
 */
function generateSixDigitCode() {
    let code = ""
    for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10)
    }
    return code
}

/**
 * Extracts a cookie value by name from cookie header
 * 
 * @param {string} cookieHeader - The cookie header string
 * @param {string} cookieName - Name of cookie to extract
 * @returns {string|undefined} Cookie value or undefined if not found
 */
function extractCookie(cookieHeader, cookieName) {
    if (!cookieHeader) return undefined
    const cookies = cookieHeader.split(";")
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim()
        if (cookie.startsWith(cookieName + "=")) {
            return cookie.substring(cookieName.length + 1)
        }
    }
    return undefined
}

const SESSION_TIMEOUT = 5 * 60 * 1000

// Session middleware
app.use(async (req, res, next) => {
    const cookie = req.headers.cookie
    const sessionId = cookie ? cookie.split("=")[1] : undefined

    if (sessionId) {
        const session = await persistence.getSession(sessionId)
        if (session) {
            if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
                await persistence.deleteSession(sessionId)
            } else {
                await persistence.updateSessionActivity(sessionId)
                req.session = session
            }
        }
    }
    next()
})

// Security log middleware
app.use(async (req, res, next) => {
    await persistence.logSecurityEvent({
        timestamp: new Date(),
        username: req.session?.user?.username || "Unknown",
        url: req.originalUrl,
        method: req.method
    })
    next()
})

// Auth middleware
function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect("/login")
    next()
}

function requireAdmin(req, res, next) {
    if (req.session.user.role !== "admin") return res.send("Access denied")
    next()
}

// Login routes
app.get("/login", (req, res) => {
    res.render("login", { layout: undefined, message: req.query.message })
})

app.get("/signup", (req, res) => {
    res.render("signup", { layout: undefined, message: req.query.message })
})

app.post("/signup", async (req, res) => {
    const { username, password, confirmPassword, email } = req.body
    
    // Validation
    if (!username || !password || !confirmPassword || !email) {
        return res.redirect("/signup?message=All+fields+are+required")
    }
    
    if (username.length < 3) {
        return res.redirect("/signup?message=Username+must+be+at+least+3+characters")
    }
    
    if (password.length < 6) {
        return res.redirect("/signup?message=Password+must+be+at+least+6+characters")
    }
    
    if (password !== confirmPassword) {
        return res.redirect("/signup?message=Passwords+do+not+match")
    }
    
    // Check if user already exists
    const existingUser = await persistence.findUser(username)
    if (existingUser) {
        return res.redirect("/signup?message=Username+already+exists")
    }
    
    // Create new user
    try {
        await persistence.createUser(username, password, email)
        return res.redirect("/login?message=Account+created+successfully.+Please+login.")
    } catch (error) {
        return res.redirect("/signup?message=Error+creating+account.+Please+try+again.")
    }
})

app.post("/login", async (req, res) => {
    const { username, password } = req.body
    
    // Check if account is locked
    const isLocked = await persistence.isAccountLocked(username)
    if (isLocked) {
        return res.redirect("/login?message=Account+locked.+Contact+support.")
    }
    
    const user = await persistence.findUser(username)

    if (!user || user.password !== password) {
        // Increment failed attempts
        const attempts = await persistence.incrementFailedAttempts(username)
        const failedCount = attempts.failedAttempts
        
        // Send suspicious activity email after 3 failed attempts
        if (failedCount === 3) {
            emailSystem.sendSuspiciousActivityEmail(user?.email || username + "@company.com")
        }
        
        // Lock account after 10 failed attempts
        if (failedCount >= 10) {
            await persistence.lockAccount(username)
            emailSystem.sendAccountLockedEmail(user?.email || username + "@company.com")
            return res.redirect("/login?message=Account+locked+due+to+multiple+failed+attempts.")
        }
        
        return res.redirect("/login?message=Invalid+credentials")
    }

    // Valid credentials - generate 2FA code
    const code = generateSixDigitCode()
    persistence.store2FACode(username, code)
    
    // Send 2FA code email
    emailSystem.send2FACodeEmail(user.email, code)
    
    // Store username in temporary session for 2FA validation
    const tempSessionId = new mongodb.ObjectId().toString()
    res.setHeader("Set-Cookie", ["tempSessionId=" + tempSessionId + "; HttpOnly", "2faUsername=" + username])
    
    res.redirect("/2fa?message=Check+your+email+for+the+2FA+code")
})

app.get("/2fa", (req, res) => {
    const tempSessionId = req.headers.cookie ? extractCookie(req.headers.cookie, "tempSessionId") : undefined
    const twoFAUsername = req.headers.cookie ? extractCookie(req.headers.cookie, "2faUsername") : undefined
    
    if (!twoFAUsername) {
        return res.redirect("/login?message=Please+login+first")
    }
    
    res.render("twoFA", { 
        layout: undefined, 
        message: req.query.message,
        username: twoFAUsername
    })
})

app.post("/2fa", async (req, res) => {
    const { code } = req.body
    const twoFAUsername = req.headers.cookie ? extractCookie(req.headers.cookie, "2faUsername") : undefined
    
    if (!twoFAUsername) {
        return res.redirect("/login?message=Please+login+first")
    }
    
    const codeData = persistence.get2FACode(twoFAUsername)
    
    if (!codeData) {
        return res.redirect("/2fa?message=2FA+code+expired.+Please+login+again.")
    }
    
    if (codeData.code !== code) {
        return res.redirect("/2fa?message=Invalid+2FA+code.+Try+again.")
    }
    
    // Code is valid - create session and reset failed attempts
    const user = await persistence.findUser(twoFAUsername)
    const sessionId = new mongodb.ObjectId().toString()
    
    await persistence.createSession(sessionId, {
        username: user.username,
        role: user.role
    })
    
    // Reset failed login attempts on successful login
    await persistence.resetFailedAttempts(twoFAUsername)
    
    // Remove 2FA code after use
    persistence.remove2FACode(twoFAUsername)
    
    res.setHeader("Set-Cookie", [
        "sessionId=" + sessionId + "; HttpOnly",
        "tempSessionId=; Max-Age=0",
        "2faUsername=; Max-Age=0"
    ])
    res.redirect("/")
})

app.get("/logout", async (req, res) => {
    const cookie = req.headers.cookie
    const sessionId = cookie ? cookie.split("=")[1] : undefined
    if (sessionId) await persistence.deleteSession(sessionId)

    res.setHeader("Set-Cookie", "sessionId=; Max-Age=0")
    res.redirect("/login")
})

// Routes
app.get("/", requireLogin, async (req, res) => {
    const employees = await persistence.getAllEmployees()
    res.render("landing", { employees, user: req.session.user, layout: undefined })
})

app.get("/employeeDetails", requireLogin, async (req, res) => {
    const empID = req.query.empId
    const employee = await persistence.findEmployee(empID)
    if (!employee) return res.send("Employee not found")

    const shifts = await persistence.getEmployeeShifts(empID)

    for (let i = 0; i < shifts.length - 1; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
            const da = new Date(shifts[i].date + "T" + shifts[i].startTime)
            const db = new Date(shifts[j].date + "T" + shifts[j].startTime)
            if (da > db) {
                const temp = shifts[i]
                shifts[i] = shifts[j]
                shifts[j] = temp
            }
        }
    }

    for (let i = 0; i < shifts.length; i++) {
        const hour = parseInt(shifts[i].startTime.split(":")[0])
        shifts[i].isMorning = hour < 12
    }

    res.render("employeeDetails", { employee, shifts, user: req.session.user, layout: undefined })
})

app.get("/editEmployee", requireLogin, requireAdmin, async (req, res) => {
    const employee = await persistence.findEmployee(req.query.empId)
    res.render("editEmployee", { employee, layout: undefined })
})

app.post("/editEmployee", requireLogin, requireAdmin, async (req, res) => {
    const name = req.body.name.trim()
    const phone = req.body.phone.trim()

    if (!name) return res.send("Name cannot be empty")
    if (!/^\d{4}-\d{4}$/.test(phone)) return res.send("Invalid phone")

    await persistence.updateEmployee(req.body.empId, { name, phone })
    res.redirect("/")
})

/**
 * GET /employee/:id/upload - Show document upload form
 */
app.get("/employee/:id/upload", requireLogin, async (req, res) => {
    const empId = req.params.id
    const employee = await persistence.findEmployee(empId)
    
    if (!employee) {
        return res.send("Employee not found")
    }
    
    const files = await persistence.getEmployeeFiles(empId)
    const fileCount = files.length
    
    res.render("uploadDocument", {
        layout: undefined,
        employee,
        fileCount,
        canUpload: fileCount < 5,
        user: req.session.user
    })
})

/**
 * POST /employee/:id/upload - Handle file upload
 */
app.post("/employee/:id/upload", requireLogin, async (req, res) => {
    const empId = req.params.id
    const employee = await persistence.findEmployee(empId)
    
    if (!employee) {
        return res.send("Employee not found")
    }
    
    // Check file count limit
    const files = await persistence.getEmployeeFiles(empId)
    if (files.length >= 5) {
        return res.send("Maximum 5 documents per employee allowed")
    }
    
    // Parse form data manually (file upload without multer)
    // For now, we'll use a workaround by checking request body
    // In production, use multer middleware
    return res.send("File upload requires form implementation. See documentation.")
})

/**
 * GET /employee/:id/documents/:docId - Access protected document
 */
app.get("/employee/:id/documents/:docId", requireLogin, async (req, res) => {
    const empId = req.params.id
    const docId = req.params.docId
    
    try {
        const fileMetadata = await persistence.getFileById(docId)
        
        if (!fileMetadata) {
            return res.send("Document not found")
        }
        
        if (fileMetadata.employeeId !== empId) {
            return res.send("Document does not belong to this employee")
        }
        
        // Check file exists
        if (!fs.existsSync(fileMetadata.storagePath)) {
            return res.send("File not found on server")
        }
        
        // Stream file
        res.download(fileMetadata.storagePath, fileMetadata.originalName)
    } catch (error) {
        res.send("Error accessing document: " + error.message)
    }
})

app.listen(8000)