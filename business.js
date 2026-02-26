const persistence = require('./persistence')

/**
 * Compute shift duration in hours.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number} Duration in hours
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(':')
    const endParts = endTime.split(':')
    const startMinutes = Number(startParts[0]) * 60 + Number(startParts[1])
    const endMinutes = Number(endParts[0]) * 60 + Number(endParts[1])
    return (endMinutes - startMinutes) / 60
}

/**
 * Return all employees.
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    return await persistence.getAllEmployees()
}

/**
 * Get shifts for an employee.
 * @param {string} empId
 * @returns {Promise<Array>}
 */
async function getEmployeeShifts(empId) {
    return await persistence.getEmployeeShifts(empId)
}

/**
 * Find employee by ID.
 * @param {string} empId
 * @returns {Promise<Object|undefined>}
 */
async function findEmployee(empId) {
    return await persistence.findEmployee(empId)
}

/**
 * Update employee details.
 * @param {string} empId
 * @param {{name:string, phone:string}} data
 */
async function updateEmployee(empId, data) {
    await persistence.updateEmployee(empId, data)
}

module.exports = {
    getAllEmployees,
    getEmployeeShifts,
    findEmployee,
    updateEmployee,
    computeShiftDuration
}