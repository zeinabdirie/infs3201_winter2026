const express = require("express")
const bodyParser = require("body-parser")
const handleBars = require("express-handlebars")
const mongodb = require("mongodb")
const persistence = require("./persistence")

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

app.set("views", __dirname + "/templates")
app.set("view engine", "handlebars")
app.engine("handlebars", handleBars.engine({
    helpers: {
        eq: function(a, b) {
            return a === b
        }
    }
}))

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

app.post("/login", async (req, res) => {
    const { username, password } = req.body
    const user = await persistence.findUser(username)

    if (!user || user.password !== password) {
        return res.redirect("/login?message=Invalid+credentials")
    }

    const sessionId = new mongodb.ObjectId().toString()
    await persistence.createSession(sessionId, {
        username: user.username,
        role: user.role
    })

    res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly`)
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

app.listen(8000)