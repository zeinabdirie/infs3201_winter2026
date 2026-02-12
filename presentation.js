const prompt = require('prompt-sync')()
const business = require('./business')

async function displayEmployees() {
    const employees = await business.getAllEmployees()

    console.log('Employee ID  Name                Phone')
    console.log('-----------  ------------------- ---------')

    for (let emp of employees) {
        console.log(
            `${emp.employeeId.padEnd(13)}${emp.name.padEnd(20)}${emp.phone}`
        )
    }
}

async function addNewEmployee() {
    const name = prompt('Enter employee name: ')
    const phone = prompt('Enter phone number: ')

    await business.addEmployeeRecord({ name, phone })
    console.log('Employee added...')
}

async function scheduleEmployee() {
    const empId = prompt('Enter employee ID: ')
    const shiftId = prompt('Enter shift ID: ')

    const result = await business.assignShift(empId, shiftId)

    if (result === 'Ok') {
        console.log('Shift Recorded')
    } else {
        console.log(result)
    }
}

async function getEmployeeSchedule() {
    const empId = prompt('Enter employee ID: ')
    const shifts = await business.getEmployeeShifts(empId)

    console.log('\nDate        Start   End')
    console.log('----------  ------  ------')

    for (let s of shifts) {
        console.log(
            `${s.date.padEnd(12)}${s.startTime.padEnd(8)}${s.endTime}`
        )
    }
}

async function displayMenu() {
    while (true) {
        console.log('\n1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')

        const choice = Number(prompt('What is your choice> '))

        if (choice === 1) await displayEmployees()
        else if (choice === 2) await addNewEmployee()
        else if (choice === 3) await scheduleEmployee()
        else if (choice === 4) await getEmployeeSchedule()
        else if (choice === 5) break
        else console.log('Error in selection')
    }

    console.log('*** Goodbye!')
}

displayMenu()
