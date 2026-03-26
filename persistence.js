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
        client = new mongodb.MongoClient("mongodb+srv://60099926:12class34@cluster0.m0ukges.mongodb.net/")
        await client.connect()
    }
    return client.db("assignment4")
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

module.exports = {
    getAllEmployees,
    findEmployee,
    updateEmployee,
    getEmployeeShifts,
    findUser,
    createSession,
    getSession,
    updateSessionActivity,
    deleteSession,
    logSecurityEvent
}