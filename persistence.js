const mongodb = require("mongodb")

let client

/**
 * Establishes a connection to the MongoDB database.
 * Reuses the existing client if already connected.
 * 
 * @returns {Promise<import("mongodb").Db>} The database instance
 */
async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient("mongodb+srv://zeinab:12class34@cluster0.vgwl6zo.mongodb.net/")
        await client.connect()
    }
    return client.db("infs3201_winter2026")
}

/**
 * Retrieves all employees from the database.
 * 
 * @returns {Promise<Array>} List of employee documents
 */
async function getAllEmployees() {
    const db = await connectDatabase()
    return db.collection("employees").find().toArray()
}

/**
 * Finds a single employee by their ID.
 * 
 * @param {string} empId - The employee's ID
 * @returns {Promise<Object|null>} The employee document or null if not found
 */
async function findEmployee(empId) {
    const db = await connectDatabase()
    return db.collection("employees").findOne({ _id: new mongodb.ObjectId(empId) })
}

/**
 * Updates an employee's data.
 * 
 * @param {string} empId - The employee's ID
 * @param {Object} data - The data to update
 * @returns {Promise<void>}
 */
async function updateEmployee(empId, data) {
    const db = await connectDatabase()
    await db.collection("employees").updateOne(
        { _id: new mongodb.ObjectId(empId) },
        { $set: data }
    )
}

/**
 * Retrieves all shifts assigned to a specific employee.
 * 
 * @param {string} empId - The employee's ID
 * @returns {Promise<Array>} List of shift documents
 */
async function getEmployeeShifts(empId) {
    const db = await connectDatabase()
    const shifts = []
    const all = await db.collection("shifts").find().toArray()

    for (let i = 0; i < all.length; i++) {
        for (let j = 0; j < all[i].employees.length; j++) {
            if (all[i].employees[j].toString() === empId) {
                shifts.push(all[i])
                break
            }
        }
    }

    return shifts
}

/**
 * Finds a user by username.
 * 
 * @param {string} username - The username
 * @returns {Promise<Object|null>} The user document or null if not found
 */
async function findUser(username) {
    const db = await connectDatabase()
    return db.collection("users").findOne({ username })
}

/**
 * Creates a new user account.
 * 
 * @param {string} username - The username
 * @param {string} password - The password
 * @param {string} email - The email address
 * @param {string} role - The user role (default: "user")
 * @returns {Promise<Object>} The created user document with _id
 */
async function createUser(username, password, email, role = "user") {
    const db = await connectDatabase()
    const result = await db.collection("users").insertOne({
        username,
        password,
        email,
        role,
        createdAt: new Date()
    })
    return result
}

/**
 * Creates a new session.
 * 
 * @param {string} id - The session ID
 * @param {Object} user - The user data
 * @returns {Promise<void>}
 */
async function createSession(id, user) {
    const db = await connectDatabase()
    await db.collection("sessions").insertOne({
        _id: id,
        user,
        lastActivity: Date.now()
    })
}

/**
 * Retrieves a session by ID.
 * 
 * @param {string} id - The session ID
 * @returns {Promise<Object|null>} The session document or null if not found
 */
async function getSession(id) {
    const db = await connectDatabase()
    return db.collection("sessions").findOne({ _id: id })
}

/**
 * Updates the last activity timestamp of a session.
 * 
 * @param {string} id - The session ID
 * @returns {Promise<void>}
 */
async function updateSessionActivity(id) {
    const db = await connectDatabase()
    await db.collection("sessions").updateOne(
        { _id: id },
        { $set: { lastActivity: Date.now() } }
    )
}

/**
 * Deletes a session by ID.
 * 
 * @param {string} id - The session ID
 * @returns {Promise<void>}
 */
async function deleteSession(id) {
    const db = await connectDatabase()
    await db.collection("sessions").deleteOne({ _id: id })
}

/**
 * Logs a security-related event.
 * 
 * @param {Object} event - The event data to log
 * @returns {Promise<void>}
 */
async function logSecurityEvent(event) {
    const db = await connectDatabase()
    await db.collection("security_log").insertOne(event)
}

/**
 * Gets login attempt tracking for a user.
 * 
 * @param {string} username - The username
 * @returns {Promise<Object|null>} Object with failedAttempts and isLocked fields
 */
async function getLoginAttempts(username) {
    const db = await connectDatabase()
    return db.collection("login_attempts").findOne({ username })
}

/**
 * Increments failed login attempts for a user.
 * 
 * @param {string} username - The username
 * @returns {Promise<Object>} Updated attempt tracking object
 */
async function incrementFailedAttempts(username) {
    const db = await connectDatabase()
    const result = await db.collection("login_attempts").findOneAndUpdate(
        { username },
        { $inc: { failedAttempts: 1 } },
        { upsert: true, returnDocument: "after" }
    )
    return result.value
}

/**
 * Resets failed login attempts for a user.
 * 
 * @param {string} username - The username
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    const db = await connectDatabase()
    await db.collection("login_attempts").updateOne(
        { username },
        { $set: { failedAttempts: 0 } },
        { upsert: true }
    )
}

/**
 * Locks a user account after too many failed attempts.
 * 
 * @param {string} username - The username
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    const db = await connectDatabase()
    await db.collection("login_attempts").updateOne(
        { username },
        { $set: { isLocked: true, lockedAt: new Date() } },
        { upsert: true }
    )
}

/**
 * Checks if a user's account is locked.
 * 
 * @param {string} username - The username
 * @returns {Promise<boolean>} True if account is locked
 */
async function isAccountLocked(username) {
    const loginAttempts = await getLoginAttempts(username)
    return loginAttempts && loginAttempts.isLocked === true
}

/**
 * Stores a 2FA code temporarily (in-memory) with expiration.
 * 
 * @param {string} username - The username
 * @param {string} code - The 6-digit code
 * @param {number} expirationMs - Time in milliseconds before code expires (default 3 minutes)
 * @returns {void}
 */
function store2FACode(username, code, expirationMs = 3 * 60 * 1000) {
    if (!persistence2FAStore) {
        persistence2FAStore = {}
    }
    persistence2FAStore[username] = {
        code,
        timestamp: Date.now(),
        expiresAt: Date.now() + expirationMs
    }
}

/**
 * Retrieves a stored 2FA code.
 * 
 * @param {string} username - The username
 * @returns {Object|null} Object with code and timestamps, or null if not found/expired
 */
function get2FACode(username) {
    if (!persistence2FAStore || !persistence2FAStore[username]) {
        return null
    }
    const codeData = persistence2FAStore[username]
    if (Date.now() > codeData.expiresAt) {
        delete persistence2FAStore[username]
        return null
    }
    return codeData
}

/**
 * Removes a 2FA code after verification.
 * 
 * @param {string} username - The username
 * @returns {void}
 */
function remove2FACode(username) {
    if (persistence2FAStore && persistence2FAStore[username]) {
        delete persistence2FAStore[username]
    }
}

/**
 * Stores file metadata for uploaded documents.
 * 
 * @param {Object} fileData - File metadata
 * @param {string} fileData.username - Username of uploader
 * @param {string} fileData.employeeId - Employee ID
 * @param {string} fileData.originalName - Original filename
 * @param {string} fileData.storagePath - File system path
 * @param {number} fileData.size - File size in bytes
 * @param {string} fileData.mimeType - MIME type
 * @returns {Promise<Object>} Inserted document with _id
 */
async function storeFileMetadata(fileData) {
    const db = await connectDatabase()
    const result = await db.collection("file_uploads").insertOne({
        ...fileData,
        uploadedAt: new Date()
    })
    return result
}

/**
 * Gets all uploaded files for an employee.
 * 
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Array>} List of file metadata objects
 */
async function getEmployeeFiles(employeeId) {
    const db = await connectDatabase()
    return db.collection("file_uploads").find({ employeeId }).toArray()
}

/**
 * Gets a single file by ID.
 * 
 * @param {string} fileId - File ID (MongoDB ObjectId)
 * @returns {Promise<Object|null>} File metadata or null if not found
 */
async function getFileById(fileId) {
    const db = await connectDatabase()
    return db.collection("file_uploads").findOne({ _id: new mongodb.ObjectId(fileId) })
}

/**
 * Deletes file metadata from database.
 * 
 * @param {string} fileId - File ID (MongoDB ObjectId)
 * @returns {Promise<void>}
 */
async function deleteFileMetadata(fileId) {
    const db = await connectDatabase()
    await db.collection("file_uploads").deleteOne({ _id: new mongodb.ObjectId(fileId) })
}

// In-memory store for 2FA codes (temporary, expires after 3 minutes)
let persistence2FAStore = null

module.exports = {
    getAllEmployees,
    findEmployee,
    updateEmployee,
    getEmployeeShifts,
    findUser,
    createUser,
    createSession,
    getSession,
    updateSessionActivity,
    deleteSession,
    logSecurityEvent,
    getLoginAttempts,
    incrementFailedAttempts,
    resetFailedAttempts,
    lockAccount,
    isAccountLocked,
    store2FACode,
    get2FACode,
    remove2FACode,
    storeFileMetadata,
    getEmployeeFiles,
    getFileById,
    deleteFileMetadata
}