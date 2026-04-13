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

/**
 * Validates a file for upload
 * Checks: MIME type, extension, and size
 * 
 * @param {string} mimeType - File MIME type
 * @param {string} filename - Original filename
 * @param {number} fileSizeBytes - File size in bytes
 * @returns {Object} Validation result with isValid and error message
 */
function validateFileUpload(mimeType, filename, fileSizeBytes) {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
    
    // Check MIME type
    if (mimeType !== "application/pdf") {
        return {
            isValid: false,
            error: "Only PDF files are allowed"
        }
    }
    
    // Check file extension
    if (!filename.toLowerCase().endsWith(".pdf")) {
        return {
            isValid: false,
            error: "File must have .pdf extension"
        }
    }
    
    // Check file size
    if (fileSizeBytes > MAX_FILE_SIZE) {
        return {
            isValid: false,
            error: "File size exceeds 2MB limit"
        }
    }
    
    return { isValid: true }
}

/**
 * Checks if user can upload more files to an employee
 * Maximum of 5 documents per employee
 * 
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Result with canUpload boolean and current count
 */
async function checkUploadLimit(employeeId) {
    const files = await persistence.getEmployeeFiles(employeeId)
    return {
        canUpload: files.length < 5,
        currentCount: files.length,
        maxCount: 5
    }
}

/**
 * Processes and stores a file upload
 * Creates metadata record in database and stores file
 * 
 * @param {Object} uploadParams
 * @param {string} uploadParams.employeeId - Employee ID
 * @param {string} uploadParams.username - Username of uploader
 * @param {string} uploadParams.filename - Original filename
 * @param {string} uploadParams.storagePath - Path where file is stored
 * @param {number} uploadParams.fileSize - File size in bytes
 * @param {string} uploadParams.mimeType - MIME type
 * @returns {Promise<Object>} Stored file metadata with _id
 */
async function storeFileUpload(uploadParams) {
    return await persistence.storeFileMetadata({
        employeeId: uploadParams.employeeId,
        username: uploadParams.username,
        originalName: uploadParams.filename,
        storagePath: uploadParams.storagePath,
        size: uploadParams.fileSize,
        mimeType: uploadParams.mimeType
    })
}

module.exports = {
    getAllEmployees,
    findEmployee,
    updateEmployee,
    getEmployeeShifts,
    findUser,
    validateFileUpload,
    checkUploadLimit,
    storeFileUpload
}