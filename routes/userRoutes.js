const express = require("express");
const { registerUser, loginUser, listListners, deleteUser, walletBalanceUsers, depositUser, transaction, updateProfile, getUserOrListenerDetails, updateWork, updateEducation, listUserTransactions, listUserDeposits, sendConnectionRequest, acceptConnectionRequest, isUserBlockedByListener, getUserInboxNotifications, sendMessageToListener, getUserMessages } = require("../controller/usercontroller");
const validateToken = require("../middleware/validateTokenHandler");
const userCheck = require("../middleware/userToken");
const nocache = require("../middleware/agoraNoCache");
const {generateAgoraTokens} = require("../controller/agoraCallToken");
const {generateChatTokens} = require("../controller/agoraChatToken");
const router = express.Router();

router.post("/registerUser", registerUser);

router.post("/login", loginUser);

router.get("/listlistners", validateToken, userCheck, listListners);

router.delete("/delete", validateToken, userCheck, deleteUser);

//Wallet Balance of User and transaction
router.get("/walletBalance", validateToken, userCheck, walletBalanceUsers);

router.post('/deposit', validateToken, userCheck, depositUser); 

router.post("/transaction", validateToken, userCheck, transaction);

// List all transactions made by the user
router.get("/transactions", validateToken, userCheck, listUserTransactions);

// List all deposits made by the user
router.get("/deposits", validateToken, userCheck, listUserDeposits);

//Update User Profile
router.put("/updateProfile/:id", validateToken, userCheck, updateProfile);

router.put("/updateProfile/work/:id", validateToken, userCheck, updateWork);

router.put("/updateProfile/education/:id", validateToken, userCheck, updateEducation);

//List of User or Listener Details based on ID
router.get("/details/:id", validateToken, userCheck, getUserOrListenerDetails);

//Store missed calls
// router.post("/missedCall", validateToken, userCheck, storeMissedCall);

//Transaction history

// router.get("/verifyProfile",validateToken,verifyProfile);

//Connect with Listener generate token
router.post("/agoraToken", validateToken, userCheck, nocache, generateAgoraTokens);
router.post("/agoraChatToken", validateToken, userCheck, nocache, generateChatTokens);


// Send connection request
router.post("/sendConnectionRequest", validateToken, userCheck, sendConnectionRequest);

// Accept connection request
router.post("/acceptConnectionRequest", validateToken, userCheck, acceptConnectionRequest);

// Check if user is blocked by listener
router.get("/isUserBlocked/:listenerId", validateToken, userCheck, isUserBlockedByListener);

// Show all inbox notifications for the user
router.get("/inbox/notifications", validateToken, userCheck, getUserInboxNotifications);

// Send message to listener
router.post("/sendMessage", validateToken, userCheck, sendMessageToListener);

// Fetch messages sent to the user from listeners
router.get("/messages", validateToken, userCheck, getUserMessages);

module.exports = router;