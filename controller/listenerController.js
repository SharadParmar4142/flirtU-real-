const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const secretKey = process.env.ACCESS_TOKEN_SECRET; // Secret key for JWT
const Redis = require('ioredis');
const redis = new Redis();
const io = require('../socket'); // Assuming you have a socket.js file to initialize Socket.io


redis.on('error', (err) => {
    console.error('Redis error:', err);
});

// Function to subscribe listener to FCM topic
const subscribeToTopic = async (deviceToken, topic) => {
    try {
        await admin.messaging().subscribeToTopic([deviceToken], topic);
        console.log(`Successfully subscribed to topic: ${topic}`);
    } catch (error) {
        console.error(`Error subscribing to topic: ${topic}`, error);
    }
};


// @desc Login a Listener
// @route POST /listener/login
// @access Public
const loginListener = asyncHandler(async (req, res) => {
    const { email, device_token } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { email, device_token }
        });
        const listener = await prisma.listener.findFirst({
            where: { email, device_token }  
        });
        if (user) {

            await prisma.user.update({
                where: { email },
                data: { device_token }
            });
            const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
            await subscribeToTopic(device_token, 'users'); // Subscribe to users topic
            res.status(200).json({ message: "User logged in", type: "user", token });
        } 
        else if (listener) {

            await prisma.listener.update({
                where: { email },
                data: { device_token }
            });

            const token = jwt.sign({ id: listener.id, email: listener.email, name: listener.name }, secretKey, { expiresIn: '1h' });
            await subscribeToTopic(device_token, 'listeners');

            res.status(200).json({ message: "Listener logged in", type: "listener", token });
        } 
        else {
            res.status(404).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List Listeners
// @route GET /listener/listlisteners
// @access Private
const listListeners = asyncHandler(async (req, res) => {
    const cacheKey = 'listListeners';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const listeners = await prisma.listener.findMany({
            select: { name, age, image, language }
        });
        await redis.set(cacheKey, JSON.stringify(listeners), 'EX', 86400); // Cache for 1 day
        res.status(200).json(listeners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc Delete a Listener
// @route DELETE /listener
// @access Private
const deleteListener = asyncHandler(async (req, res) => {
    const { id } = req.body;
    try {
        await prisma.listener.update({
            where: { id },
            data: { ac_delete: true }
        });
        res.status(200).json({ message: "Listener is deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Get Wallet Balance
// @route GET /listener/wallet
// @access Private
const walletBalanceListeners = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    try {
        const listener = await prisma.listener.findUnique({
            where: { id },
            select: { wallet }
        });
        res.status(200).json({ wallet: listener.wallet });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc Withdraw from Listener Wallet
// @route POST /listener/withdraw
// @access Private
const withdrawListener = asyncHandler(async (req, res) => {
    const { amount, paymentMode, upi_id, account_number, ifsc_code, signatureId } = req.body;
    const { id } = req.user; // Get listener ID from the token

    if (!amount || !paymentMode || !signatureId || (paymentMode === 'UPI' && !upi_id) || (paymentMode === 'BANK' && (!account_number || !ifsc_code))) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    try {
        const listener = await prisma.listener.findUnique({
            where: { id },
            select: { wallet }
        });

        if (!listener) {
            return res.status(404).json({ message: "Listener not found" });
        }

        if (amount > listener.wallet) {
            return res.status(400).json({ message: "Amount more than balance" });
        }

        await prisma.$transaction(async (tx) => {
            // Deduct amount from listener's wallet
            const updatedListener = await tx.listener.update({
                where: { id },
                data: { wallet: { decrement: amount } }
            });

            // Create withdraw request with PENDING status
            await tx.withdraw.create({
                data: {
                    listenerId: id,
                    amount,
                    mode: 'WITHDRAW',
                    status: 'PENDING',
                    paymentMode,
                    upi_id,
                    account_number,
                    ifsc_code,
                    requestApproveAdmin: 'WAITING'
                }
            });

            res.status(200).json({ wallet: updatedListener.wallet });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc Update the existing listener data
// @route PUT /listener/updateProfile/:id
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params; // Listener ID from URL params
        const {
          language,
          favoriteFood,
          hobbies,
          idols,
          about
        } = req.body;
    
        // Validate required inputs (optional)
        if (!id) return res.status(400).json({ error: "Listener ID is required" });
    
        // Update the listener in the database
        const updatedListener = await prisma.listener.update({
          where: { id: parseInt(id) },
          data: {
            language,
            favoriteFood,
            hobbies,
            idols,
            about
          },
        });
    
        return res.status(200).json({
          message: "Listener updated successfully",
          listener: updatedListener,
        });
      } catch (error) {
        console.error("Error updating listener:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
});

// @desc Get User or Listener Details by ID
// @route GET /listener/details/:id
// @access Private
const getUserOrListenerDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: { 
                name: true,
                age: true, 
                intrests:true,
                sex:true,
                bio:true, 
                image: true,
                hobbies: true,
                language: true, 
                star_sign: true, 
                drinking: true, 
                smoking: true,
                relationship:true,
                pets:true,
                work:true,
                education:true}
        });

        if (user) {
            return res.status(200).json(user);
        }

        const listener = await prisma.listener.findUnique({
            where: { id: parseInt(id) },
            select: { 
                name: true, 
                age: true,
                sex:true, 
                idols: true, 
                language: true, 
                image: true, 
                about: true, 
                hobbies: true, 
                favoriteFood: true}
        });

        if (listener) {
            return res.status(200).json(listener);
        }

        res.status(404).json({ message: "User or Listener not found" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all transactions received by the listener
// @route GET /listener/transactions
// @access Private
const listListenerTransactions = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    try {
        const transactions = await prisma.transaction.findMany({
            where: { listenerId: id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                listenerShare: true,
                mode: true,
                status: true,
                created_at: true,
                user: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            }
        });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });   
    }
});

// @desc List all withdrawals made by the listener
// @route GET /listener/withdrawals
// @access Private
const listListenerWithdrawals = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    try {
        const withdrawals = await prisma.withdraw.findMany({
            where: { listenerId: id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                amount: true,
                mode: true,
                status: true,
                paymentMode: true,
                upi_id: true,
                account_number: true,
                ifsc_code: true,
                created_at: true
            }
        });
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Request profile update
// @route POST /listener/requestProfileUpdate
// @access Private
const requestProfileUpdate = asyncHandler(async (req, res) => {
    const { id } = req.user; // Listener ID from JWT token
    const {
        image,
        language,
        favoriteFood,
        hobbies,
        idols,
        about
    } = req.body;

    if (!id) return res.status(400).json({ error: "Listener ID is required" });

    try {
        // Create or update pending profile request
        const pendingProfile = await prisma.pendingProfile.upsert({
            where: { listenerId: id },
            update: {
                image,
                language,
                favoriteFood,
                hobbies,
                idols,
                about
            },
            create: {
                listenerId: id,
                image,
                language,
                favoriteFood,
                hobbies,
                idols,
                about
            }
        });

        

        // Update listener's updateProfile status to WAITING
        await prisma.listener.update({
            where: { id },
            data: { updateProfile: 'WAITING' }
        });

        res.status(200).json({ message: "Profile update request submitted", pendingProfile });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Get missed meetings for a listener
// @route GET /listener/missedMeetings
// @access Private
const getMissedMeetings = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    const cacheKey = `missedMeetings_${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const missedMeetings = await prisma.missedMeeting.findMany({
            where: { listenerId: id },
            orderBy: { scheduledAt: 'desc' }
        });
        await redis.set(cacheKey, JSON.stringify(missedMeetings), 'EX', 86400); // Cache for 1 day
        res.status(200).json(missedMeetings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Get penalties for a listener
// @route GET /listener/penalties
// @access Private
const getPenalties = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    const cacheKey = `penalties_${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const penalties = await prisma.penalty.findMany({
            where: { listenerId: id },
            orderBy: { createdAt: 'desc' }
        });
        await redis.set(cacheKey, JSON.stringify(penalties), 'EX', 86400); // Cache for 1 day
        res.status(200).json(penalties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Request leave for a listener
// @route POST /listener/requestLeave
// @access Private
const requestLeave = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    const { days, reason } = req.body;

    if (!days || !reason) {
        return res.status(400).json({ message: "Days and reason are required" });
    }

    try {
        const listener = await prisma.listener.findUnique({
            where: { id },
            select: { leaveAvailable }
        });

        if (listener.leaveAvailable >= days) {
            await prisma.listener.update({
                where: { id },
                data: { leaveAvailable: { decrement: days } }
            });
            res.status(200).json({ message: "Leave granted" });
        } 
        else {
            await prisma.leaveRequest.create({
                data: {
                    listenerId: id,
                    days,
                    reason,
                    status: 'PENDING'
                }
            });
            res.status(200).json({ message: "Leave request submitted for approval" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Mark listener attendance
// @route POST /listener/markAttendance
// @access Private
const markAttendance = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
        return res.status(400).json({ message: "Scheduled time is required" });
    }

    try {
        // Update the record in MissedMeeting
        const updatedRecord = await prisma.missedMeeting.updateMany({
            where: {
                listenerId: id,
                scheduledAt: new Date(scheduledAt)
            },
            data: {
                attended: true,
                attendedAt: new Date() // Mark attendance time
            }
        });

        if (updatedRecord.count > 0) {
            res.status(200).json({ message: "Attendance marked successfully" });
        } else {
            res.status(404).json({ message: "No matching meeting found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Handle Connection Request (Accept/Reject)
// @route POST /listener/handleConnectionRequest
// @access Private
const handleConnectionRequest = asyncHandler(async (req, res) => {
    const { requestId, action } = req.body;

    if (!requestId || !action) {
        return res.status(400).json({ message: "Request ID and action are required" });
    }

    try {
        const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
        const connectionRequest = await prisma.connectionRequest.update({
            where: { id: requestId },
            data: { status }
        });

        // Notify user of the action taken on the request
        const event = action === 'accept' ? 'connectionAccepted' : 'connectionRejected';
        io.getIo().to(connectionRequest.userId).emit(event, connectionRequest);

        res.status(200).json({ message: `Connection request ${status.toLowerCase()}`, connectionRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Get all inbox notifications for the listener
// @route GET /listener/inbox/notifications
// @access Private
const getListenerInboxNotifications = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get listener ID from the token

    try {
        const generalNotifications = await prisma.generalNotification.findMany({
            where: {
                OR: [
                    { type: 'ALL' },
                    { type: 'LISTENER' }
                ]
            },
            orderBy: { created_at: 'desc' }
        });

        const specificNotifications = await prisma.specificNotification.findMany({
            where: { listenerId: id },
            orderBy: { created_at: 'desc' }
        });

        const notifications = [...generalNotifications, ...specificNotifications];
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json(notifications);
    } 
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    loginListener,
    listListeners,
    deleteListener,
    walletBalanceListeners,
    withdrawListener,
    updateProfile,
    getUserOrListenerDetails,
    listListenerTransactions,
    listListenerWithdrawals,
    requestProfileUpdate,
    getMissedMeetings,
    getPenalties,
    requestLeave,
    markAttendance,
    handleConnectionRequest,
    getListenerInboxNotifications
};
