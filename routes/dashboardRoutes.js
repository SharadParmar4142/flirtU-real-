const express = require("express");
const { 
  countListeners, countNewListeners, listBusyListeners, countNewUsers, 
  rechargeToday, totalRechargeThisMonth, totalCallsToday, totalChatsToday, 
  totalVideoCallsToday, usersRegisteredByMonth, usersRegisteredOnDate, 
  totalRechargeByMonth, totalRechargeByDayInMonth, getMissedCallsToday, 
  listFailedCallsByMonth, getFailedCallDetails, notifyAll, notifyByType, notifyById,
  notifyAllInbox, notifyByTypeInbox, notifyByIdInbox
} = require("../controller/dashboardController");
const validateToken = require("../middleware/validateTokenHandler");
const adminCheck = require("../middleware/adminToken");
const router = express.Router();

//Listeners and Users
router.get("/countListeners", validateToken, adminCheck, countListeners);
router.get("/countNewListeners", validateToken, adminCheck, countNewListeners);
router.get("/listBusyListeners", validateToken, adminCheck, listBusyListeners);
router.get("/countNewUsers", validateToken, adminCheck, countNewUsers);

//Recharge
router.get("/rechargeToday", validateToken, adminCheck, rechargeToday);
router.get("/totalRechargeThisMonth", validateToken, adminCheck, totalRechargeThisMonth);

//Calls and Chats
router.get("/totalCallsToday", validateToken, adminCheck, totalCallsToday);
router.get("/totalChatsToday", validateToken, adminCheck, totalChatsToday);
router.get("/totalVideoCallsToday", validateToken, adminCheck, totalVideoCallsToday);

//Users and Recharges
router.get("/usersRegisteredByMonth", validateToken, adminCheck, usersRegisteredByMonth);
router.get("/usersRegisteredOnDate", validateToken, adminCheck, usersRegisteredOnDate);
router.get("/totalRechargeByMonth", validateToken, adminCheck, totalRechargeByMonth);
router.get("/totalRechargeByDayInMonth/:month", validateToken, adminCheck, totalRechargeByDayInMonth);

// Missed calls, video calls, and chats for today
router.get("/missedCallsToday", validateToken, adminCheck, getMissedCallsToday);

// List all failed calls of the current month date-wise
router.get("/failedCalls", validateToken, adminCheck, listFailedCallsByMonth);

// Get details of a specific failed call
router.get("/failedCallDetails/:date", validateToken, adminCheck, getFailedCallDetails);

// Notifications
router.post('/notify/all', validateToken, adminCheck, notifyAll);
router.post('/notify/type', validateToken, adminCheck, notifyByType);
router.post('/notify/specific', validateToken, adminCheck, notifyById);

// Inbox Notifications
router.post('/inbox/all', validateToken, adminCheck, notifyAllInbox);
router.post('/inbox/type', validateToken, adminCheck, notifyByTypeInbox);
router.post('/inbox/specific', validateToken, adminCheck, notifyByIdInbox);

module.exports = router;
