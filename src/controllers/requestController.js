const pool = require('../utils/database');

const verifyRole = (role) => {
    return (request, h) => {
        if (request.auth.credentials.role !== role) {
            return h.response({ message: 'Forbidden' }).code(403).takeover();
        }
        return h.continue;
    };
};

const requestMeeting = async (request, h) => {
    const { coass_id } = request.payload;
    const patient_id = request.auth.credentials.id;

    // Check if the patient already has a pending/accepted request
    const [existingRequests] = await pool.query(
        `SELECT * FROM Requests WHERE Patient_id = ? AND Status IN ('Pending', 'Accepted')`,
        [patient_id]
    );

    if (existingRequests.length > 0) {
        return h.response({ message: 'You already have a pending or accepted request.' }).code(400);
    }

    // Insert new request
    await pool.query(
        `INSERT INTO Requests (Patient_id, Coass_id, Status) VALUES (?, ?, 'Pending')`,
        [patient_id, coass_id]
    );

    return h.response({ message: 'Request submitted successfully.' }).code(201);
};

const getPendingRequests = async (request, h) => {
    const coass_id = request.auth.credentials.id;

    const [requests] = await pool.query(
        `SELECT U.Name, U.Id, R.Request_id, D.Img_disease, D.Disease_name, 
        D.Description, R.Requested_at FROM Requests R JOIN Users U ON 
        R.Patient_id = U.Id JOIN Diagnose D ON U.Id = D.Id_patient 
        WHERE R.Coass_id = ? AND R.Status = 'Pending'`,
        [coass_id]
    );

    return h.response(requests).code(200);
};

const getAcceptedRequests = async (request, h) => {
    const coass_id = request.auth.credentials.id;

    try {
        const [acceptedRequests] = await pool.query(
            `SELECT U.Name, U.Id, R.Request_id, D.Img_disease, D.Disease_name, 
            D.Description, R.Requested_at 
            FROM Requests R 
            JOIN Users U ON R.Patient_id = U.Id 
            JOIN Diagnose D ON U.Id = D.Id_patient 
            WHERE R.Coass_id = ? AND R.Status = 'Accepted'`,
            [coass_id]
        );

        if (acceptedRequests.length === 0) {
            return h.response({ message: "No accepted requests found." }).code(200);
        }

        return h.response(acceptedRequests).code(200);
    } catch (error) {
        console.error(error);
        return h.response({ message: "Failed to fetch accepted requests." }).code(500);
    }
};

const reviewRequest = async (request, h) => {
    const { request_id, status } = request.payload;

    if (!['Accepted', 'Rejected'].includes(status)) {
        return h.response({ message: 'Invalid status' }).code(400);
    }

    await pool.query(`UPDATE Requests SET Status = ?, Replied_at = NOW() WHERE Request_id = ?`, [
        status,
        request_id,
    ]);

    return h.response({ message: 'Request status updated successfully.' }).code(200);
};

module.exports = { requestMeeting, getPendingRequests, reviewRequest, getAcceptedRequests, verifyRole };
