const express = require("express");
const { listUser, listListners, blockedUsers, walletBalanceUsers, walletBalanceListners, listWithdrawalRequests, handleWithdrawalRequest, registerListener, listProfileUpdateRequests, handleProfileUpdateRequest, listAllUserTransactions, listAllListenerTransactions, listUserTransactionsById, listListenerTransactionsById, listAllDeposits, listDepositsByUserId, listAllWithdrawals, listWithdrawalsByListenerId, updateListenerProfile, updateListenerProfileImage, approveLeaveRequest, listLeaveRequests, applyLeavePenalty, scheduleMeeting, penalizeMissedMeetings } = require("../controller/admincontroller");
const validateToken = require("../middleware/validateTokenHandler");
const adminCheck = require("../middleware/adminToken");
const router = express.Router();

//List users and listeners
router.get("/listUser", validateToken, adminCheck, listUser);
router.get("/listners", validateToken, adminCheck, listListners);
router.get("/blockedUses", validateToken, adminCheck, blockedUsers);

//Wallet Balance of User and Listners
router.get("/walletBalance/users", validateToken, adminCheck, walletBalanceUsers);
router.get("/walletBalance/Listners", validateToken, adminCheck, walletBalanceListners);

//Withdrawal Requests
router.get("/withdrawalRequests", validateToken, adminCheck, listWithdrawalRequests);
router.post("/withdrawalRequests/:id", validateToken, adminCheck, handleWithdrawalRequest);

//Register Listener
router.post("/registerListener", validateToken, adminCheck, registerListener);

//Profile Update Requests of Listeners
router.get("/profileUpdateRequests", validateToken, adminCheck, listProfileUpdateRequests);
router.post("/profileUpdateRequests/:id", validateToken, adminCheck, handleProfileUpdateRequest);

//Update Listener Profile and image
router.put("/updateListenerProfile/:id", validateToken, adminCheck, updateListenerProfile);
router.put("/updateListenerProfileImage/:id", validateToken, adminCheck, updateListenerProfileImage);

// router.get("/transactions", listAllUserTransactions);//ON HOLD THE COMMON PART

// Transactions of user and listener
router.get("/transactions/user/:id", validateToken, adminCheck, listUserTransactionsById);
router.get("/transactions/listener/:id", validateToken, adminCheck, listListenerTransactionsById);


//Deposits and Withdrawals
router.get("/deposits", validateToken, adminCheck, listAllDeposits);
router.get("/deposits/user/:id", validateToken, adminCheck, listDepositsByUserId);
router.get("/withdrawals", validateToken, adminCheck, listAllWithdrawals);
router.get("/withdrawals/listener/:id", validateToken, adminCheck, listWithdrawalsByListenerId);

//Leave Requests
router.post("/approveLeaveRequest/:id", validateToken, adminCheck, approveLeaveRequest);
router.get("/leaveRequests", validateToken, adminCheck, listLeaveRequests);

//Apply Leave Penalty
router.post("/applyLeavePenalty/:id", validateToken, adminCheck, applyLeavePenalty);

//Schedule Meeting and Penalize Missed Meetings
router.post("/scheduleMeeting", validateToken, adminCheck, scheduleMeeting);
router.post("/penalizeMissedMeetings", validateToken, adminCheck, penalizeMissedMeetings);

module.exports = router;
