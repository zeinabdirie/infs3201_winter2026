const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://60099926:12class34@cluster0.m0ukges.mongodb.net/";
const dbName = "assignment4";

async function addEmployeesArray(db) {
    await db.collection("shifts").updateMany(
        {},
        { $set: { employees: [] } }
    );
}

async function embedEmployees(db) {
    const assignments = db.collection("assignments");
    const employees = db.collection("employees");
    const shifts = db.collection("shifts");

    const allAssignments = await assignments.find().toArray();

    for (let i = 0; i < allAssignments.length; i++) {
        const assignment = allAssignments[i];

        const employee = await employees.findOne({
            employeeId: assignment.employeeId
        });

        const shift = await shifts.findOne({
            shiftId: assignment.shiftId
        });

        if (!employee || !shift) {
            continue;
        }

        await shifts.updateOne(
            { _id: shift._id },
            { $addToSet: { employees: employee._id } }
        );
    }
}

async function cleanup(db) {
    await db.collection("employees").updateMany(
        {},
        { $unset: { employeeId: "" } }
    );

    await db.collection("shifts").updateMany(
        {},
        { $unset: { shiftId: "" } }
    );

    await db.collection("assignments").drop();
}

async function main() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);

        await addEmployeesArray(db);
        await embedEmployees(db);
        await cleanup(db);

    } finally {
        await client.close();
    }
}

main();