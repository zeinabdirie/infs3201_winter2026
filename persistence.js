const fs = require('fs/promises')

/**
 * Load all employees.
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    const rawData = await fs.readFile('employees.json')
    return JSON.parse(rawData)
}

/**
 * Find employee by ID.
 * @param {string} empId
 * @returns {Promise<Object|undefined>}
 */
async function findEmployee(empId) {
    const list = await getAllEmployees()

    for (let i = 0; i < list.length; i++) {
        if (list[i].employeeId === empId) {
            return list[i]
        }
    }
    return undefined
}

/**
 * Add new employee.
 * @param {{name:string, phone:string}} emp
 */
async function addEmployeeRecord(emp) {
    const list = await getAllEmployees()
    let maxId = 0

    for (let i = 0; i < list.length; i++) {
        let eid = Number(list[i].employeeId.slice(1))
        if (eid > maxId) maxId = eid
    }

    emp.employeeId = `E${String(maxId + 1).padStart(3, '0')}`
    list.push(emp)

    await fs.writeFile('employees.json', JSON.stringify(list, null, 4))
}

/**
 * Find shift by ID.
 * @param {string} shiftId
 */
async function findShift(shiftId) {
    const rawData = await fs.readFile('shifts.json')
    const list = JSON.parse(rawData)

    for (let i = 0; i < list.length; i++) {
        if (list[i].shiftId === shiftId) {
            return list[i]
        }
    }
    return undefined
}

/**
 * Find assignment.
 */
async function findAssignment(empId, shiftId) {
    const rawData = await fs.readFile('assignments.json')
    const list = JSON.parse(rawData)

    for (let i = 0; i < list.length; i++) {
        if (list[i].employeeId === empId && list[i].shiftId === shiftId) {
            return list[i]
        }
    }
    return undefined
}

/**
 * Add assignment.
 */
async function addAssignment(empId, shiftId) {
    const rawData = await fs.readFile('assignments.json')
    const list = JSON.parse(rawData)

    list.push({ employeeId: empId, shiftId: shiftId })

    await fs.writeFile('assignments.json', JSON.stringify(list, null, 4))
}

/**
 * Get shifts of an employee.
 */
async function getEmployeeShifts(empId) {
    const rawAssign = await fs.readFile('assignments.json')
    const assignments = JSON.parse(rawAssign)

    let shiftIds = []

    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === empId) {
            shiftIds.push(assignments[i].shiftId)
        }
    }

    const rawShift = await fs.readFile('shifts.json')
    const shifts = JSON.parse(rawShift)

    let result = []

    for (let i = 0; i < shifts.length; i++) {
        for (let j = 0; j < shiftIds.length; j++) {
            if (shifts[i].shiftId === shiftIds[j]) {
                result.push(shifts[i])
            }
        }
    }

    return result
}

/**
 * Load config.
 */
async function getConfig() {
    const rawData = await fs.readFile('config.json')
    return JSON.parse(rawData)
}

module.exports = {
    getAllEmployees,
    findEmployee,
    addEmployeeRecord,
    findShift,
    findAssignment,
    addAssignment,
    getEmployeeShifts,
    getConfig
}
