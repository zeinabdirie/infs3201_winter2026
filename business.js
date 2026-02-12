const persistence = require('./persistence')

/**
 * Compute shift duration in hours.
 * 
 * LLM Used: ChatGPT
 * Prompt: "Write a JavaScript function computeShiftDuration(startTime, endTime)
 * that returns the number of hours (as a decimal) between times formatted HH:MM."
 * 
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number}
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
 * Add a new employee.
 * @param {{name:string, phone:string}} emp
 */
async function addEmployeeRecord(emp) {
    await persistence.addEmployeeRecord(emp)
}

/**
 * Get shifts for employee.
 * @param {string} empId
 * @returns {Promise<Array>}
 */
async function getEmployeeShifts(empId) {
    return await persistence.getEmployeeShifts(empId)
}

/**
 * Assign shift with business rule validation.
 * @param {string} empId
 * @param {string} shiftId
 * @returns {Promise<string>}
 */
async function assignShift(empId, shiftId) {

    const employee = await persistence.findEmployee(empId)
    if (!employee) return "Employee does not exist"

    const shift = await persistence.findShift(shiftId)
    if (!shift) return "Shift does not exist"

    const existing = await persistence.findAssignment(empId, shiftId)
    if (existing) return "Employee already assigned to shift"

    const shifts = await persistence.getEmployeeShifts(empId)
    const config = await persistence.getConfig()

    let totalHours = 0

    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].date === shift.date) {
            totalHours += computeShiftDuration(
                shifts[i].startTime,
                shifts[i].endTime
            )
        }
    }

    const newHours = computeShiftDuration(
        shift.startTime,
        shift.endTime
    )

    if (totalHours + newHours > config.maxDailyHours) {
        return "Daily hour limit exceeded"
    }

    await persistence.addAssignment(empId, shiftId)

    return "Ok"
}

module.exports = {
    getAllEmployees,
    addEmployeeRecord,
    getEmployeeShifts,
    assignShift
}
