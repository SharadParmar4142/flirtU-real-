const express = require("express");
const { loginListener, listListeners, deleteListener, walletBalanceListeners, withdrawListener, updateProfile, getUserOrListenerDetails, listListenerTransactions, listListenerWithdrawals, requestProfileUpdate, getMissedMeetings, getPenalties, requestLeave, markAttendance, handleConnectionRequest, getListenerInboxNotifications, sendMessageToUser, getListenerMessages } = require("../controller/listenerController");
const validateToken = require("../middleware/validateTokenHandler");
const listenerCheck = require("../middleware/listenerToken");
const router = express.Router();

router.post("/login", loginListener);
router.get("/listlistners", validateToken, listenerCheck, listListeners);
router.delete("/delete", validateToken, listenerCheck, deleteListener);
router.get("/walletBalance", validateToken, listenerCheck, walletBalanceListeners);
router.post('/withdraw', validateToken, listenerCheck, withdrawListener);
router.put("/updateProfile/:id", validateToken, listenerCheck, updateProfile);
router.get("/details/:id", validateToken, listenerCheck, getUserOrListenerDetails);
router.get("/transactions", validateToken, listenerCheck, listListenerTransactions);
router.get("/withdrawals", validateToken, listenerCheck, listListenerWithdrawals);
router.post("/requestProfileUpdate", validateToken, listenerCheck, requestProfileUpdate);

router.get("/missedMeetings", validateToken, listenerCheck, getMissedMeetings);
router.get("/penalties", validateToken, listenerCheck, getPenalties);

router.post("/requestLeave", validateToken, listenerCheck, requestLeave);

router.post("/markAttendance", validateToken, listenerCheck, markAttendance);

// Handle connection request (accept/reject)
router.post("/handleConnectionRequest", validateToken, listenerCheck, handleConnectionRequest);

router.get("/inbox/notifications", validateToken, listenerCheck, getListenerInboxNotifications);

router.post("/sendMessage", validateToken, listenerCheck, sendMessageToUser);

// Fetch messages sent to the listener from users
router.get("/messages", validateToken, listenerCheck, getListenerMessages);

module.exports = router;