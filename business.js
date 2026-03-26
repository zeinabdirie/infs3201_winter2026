const persistence = require("./persistence")

/**
 * @returns {Promise<Array>}
 */
async function getAllEmployees() {
    return await persistence.getAllEmployees()
}

/**
 * @param {string} empId
 * @returns {Promise<Object|undefined>}
 */
async function findEmployee(empId) {
    return await persistence.findEmployee(empId)
}

/**
 * @param {string} empId
 * @param {{name:string, phone:string}} data
 */
async function updateEmployee(empId, data) {
    await persistence.updateEmployee(empId, data)
}

/**
 * @param {string} empId
 * @returns {Promise<Array>}
 */
async function getEmployeeShifts(empId) {
    return await persistence.getEmployeeShifts(empId)
}

/**
 * @param {string} username
 * @returns {Promise<Object|undefined>}
 */
async function findUser(username) {
    return await persistence.findUser(username)
}

module.exports = {
    getAllEmployees,
    findEmployee,
    updateEmployee,
    getEmployeeShifts,
    findUser
}