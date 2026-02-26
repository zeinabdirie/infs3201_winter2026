const mongodb = require("mongodb")
const fs = require("fs/promises")

let client = undefined

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient("mongodb+srv://60099926:12class34@cluster0.m0ukges.mongodb.net/")
        await client.connect()
    }
    return client.db("infs3201_winter2026")
}

/**
 * Load all employees.
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    const db = await connectDatabase()
    return db.collection("employees").find().toArray()
}

/**
 * Find employee by ID.
 * @param {string} empId
 */
async function findEmployee(empId) {
    const db = await connectDatabase()
    return db.collection("employees").findOne({ employeeId: empId })
}

/**
 * Update employee details.
 * @param {string} empId
 * @param {{name:string, phone:string}} data
 */
async function updateEmployee(empId, data) {
    const db = await connectDatabase()
    await db.collection("employees").updateOne(
        { employeeId: empId },
        { $set: { name: data.name, phone: data.phone } }
    )
}

/**
 * Find shift by ID.
 * @param {string} shiftId
 */
async function findShift(shiftId) {
    const db = await connectDatabase()
    return db.collection("shifts").findOne({ shiftId: shiftId })
}

/**
 * Get shifts of an employee.
 * @param {string} empId
 */
async function getEmployeeShifts(empId) {
    const db = await connectDatabase()

    const assignments = await db.collection("assignments").find({ employeeId: empId }).toArray()

    let shiftIds = []
    for (let i = 0; i < assignments.length; i++) {
        shiftIds.push(assignments[i].shiftId)
    }

    if (shiftIds.length === 0) {
        return []
    }

    return db.collection("shifts").find({ shiftId: { $in: shiftIds } }).toArray()
}

/**
 * Load config (from JSON file, not DB).
 */
async function getConfig() {
    const raw = await fs.readFile("config.json")
    return JSON.parse(raw)
}

module.exports = {
    getAllEmployees,
    findEmployee,
    updateEmployee,
    findShift,
    getEmployeeShifts,
    getConfig
}