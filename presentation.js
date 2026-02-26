const express = require("express")
const business = require("./business")
const bodyParser = require("body-parser")
const handleBars = require("express-handlebars")

let app = express()
app.use(bodyParser.urlencoded({ extended: false }))

app.set("views", __dirname + "/templates")
app.set("view engine", "handlebars")
app.engine("handlebars", handleBars.engine())

app.get("/", async (req, res) => {
    let allEmployees = await business.getAllEmployees()
    res.render("landing", { employees: allEmployees })
})

app.get("/employeeDetails", async (req, res) => {
    let empID = req.query.empId
    let employee = await business.findEmployee(empID)
    if (!employee) return res.send("Employee not found")

    let shifts = await business.getEmployeeShifts(empID)

    for (let i = 0; i < shifts.length - 1; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
            const da = new Date(shifts[i].date + "T" + shifts[i].time)
            const db = new Date(shifts[j].date + "T" + shifts[j].time)
            if (da > db) {
                let temp = shifts[i]
                shifts[i] = shifts[j]
                shifts[j] = temp
            }
        }
    }

    for (let i = 0; i < shifts.length; i++) {
        let hour = parseInt(shifts[i].time.split(":")[0])
        shifts[i].isMorning = hour < 12
    }

    res.render("employeeDetails", { employee: employee, shifts: shifts })
})

app.get("/editEmployee", async (req, res) => {
    let empID = req.query.empId
    let employee = await business.findEmployee(empID)
    if (!employee) return res.send("Employee not found")
    res.render("editEmployee", { employee: employee })
})

app.post("/editEmployee", async (req, res) => {
    let empID = req.body.empId
    let name = req.body.name.trim()
    let phone = req.body.phone.trim()

    let phoneRegex = /^\d{4}-\d{4}$/
    if (!name) return res.send("Name cannot be empty")
    if (!phoneRegex.test(phone)) {
        return res.send("Phone must be 4 digits - 4 digits")
    }

    await business.updateEmployee(empID, { name: name, phone: phone })

    res.redirect("/")
})

app.listen(8000, () => {
    console.log(`Server running at port 8000!`)
})