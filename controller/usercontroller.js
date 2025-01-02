const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const prisma = new PrismaClient();
const redis = new Redis();
const secretKey = process.env.ACCESS_TOKEN_SECRET; // Secret key for JWT
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


// @desc Register a User
// @route POST /user/register
// @access Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, device_token, age, sex } = req.body;
    if (!name || !email || !device_token || !age || !sex) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }
    if (!email.endsWith("@gmail.com")) {
        return res.status(400).json({ message: "Only @gmail.com emails are allowed" });
    }
    try {
        const user = await prisma.user.create({
            data: { name, email, device_token, age, sex }
        });
        const token = jwt.sign({ id: user.id, email }, secretKey, { expiresIn: '1h' });
        res.status(201).json({ ...user, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Login a User
// @route POST /user/login
// @access Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, device_token2 } = req.body;

    if (!email.endsWith("@gmail.com")) {
        return res.status(400).json({ message: "Only @gmail.com emails are allowed" });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email, device_token2 }
        });
        const listener = await prisma.listener.findFirst({
            where: { email, device_token2 }
        });
        if (user) {
            await prisma.user.update({
                where: { email },
                data: { device_token2 }
            });
            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, secretKey, { expiresIn: '1h' });
            await subscribeToTopic(device_token2, 'users'); // Subscribe to users topic

            res.status(200).json({ message: "User logged in", type: "user", token });
        } 
        else if (listener) {

            await prisma.listener.update({
                where: { email },
                data: { device_token2 }
            });

            const token = jwt.sign({ id: listener.id, email: listener.email, name: listener.name }, secretKey, { expiresIn: '1h' });
            await subscribeToTopic(device_token2, 'listeners');

            res.status(200).json({ message: "Listener logged in", type: "listener", token });
        } 
        else {
            // Register a new user if no existing user
            const newUser = await prisma.user.create({
                data: { email, device_token2 }
            });
            await prisma.user.update({
                where: { email },
                data: { device_token2 }
            });
            const token = jwt.sign({ id: newUser.id, email: newUser.email }, secretKey, { expiresIn: '1h' });
            await subscribeToTopic(device_token2, 'users'); // Subscribe to users topic

            res.status(201).json({ message: "New user registered and logged in", type: "user", token });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List Listeners
// @route GET /user/listlisteners
// @access Private
const listListners = asyncHandler(async (req, res) => {
    const cacheKey = 'listListeners';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const listeners1 = await prisma.listener.findMany({
            where: { online_status: true, busy_status: false },
            select: { name: true, age: true, image: true, language: true }
        });

        const listeners2 = await prisma.listener.findMany({
            where: { online_status: true, busy_status: true },
            select: { name: true, age: true, image: true, language: true }
        });

        const listeners3 = await prisma.listener.findMany({
            where: { online_status: false },
            select: { name: true, age: true, image: true, language: true }
        });

        const result = { listeners1, listeners2, listeners3 };
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400); // Cache for 1 day
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Delete a User
// @route DELETE /user
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body;
    try {
        await prisma.user.update({
            where: { id },
            data: { ac_delete: true }
        });
        res.status(200).json({ message: "User is deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Get Wallet Balance
// @route GET /user/wallet
// @access Private
const walletBalanceUsers = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get user ID from the token
    const cacheKey = `walletBalance:${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: { wallet }
        });
        await redis.set(cacheKey, JSON.stringify({ wallet: user.wallet }), 'EX', 86400); // Cache for 1 day
        res.status(200).json({ wallet: user.wallet });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Deposit to User Wallet
// @route POST /user/deposit
// @access Private
const depositUser = asyncHandler(async (req, res) => {
    const { amount, orderId, signatureId, transactionValid } = req.body; //orderId update
    const { id } = req.user; // Get user ID from the token

    if (!amount || !orderId || !signatureId || transactionValid === undefined) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: { wallet }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!transactionValid) {
            await prisma.deposit.create({
                data: {
                    userId: id,
                    amount,
                    orderId,
                    signatureId,
                    mode: 'recharge',
                    status: 'FAILED'
                }
            });
            return res.status(400).json({ message: "Transaction failed, please retry" });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { wallet: user.wallet + amount }
        });

        await prisma.deposit.create({
            data: {
                userId: id,
                amount,
                orderId,
                signatureId,
                mode: 'recharge',
                status: 'SUCCESS'
            }
        });

        res.status(200).json({ wallet: updatedUser.wallet });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//LATER CHANGE IF NEEDED
// @desc Transfer to Listener Wallet for talking
// @route POST /user/transaction
// @access Private
const transaction = asyncHandler(async (req, res) => {
    const { amount, listenerId, mode, duration} = req.body;
    const { id } = req.user; // Get user ID from the token

    if (!amount || !listenerId || !mode) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    const listenerShare = amount * 0.5;
    const appShare = amount - listenerShare;

    try {
        await prisma.$transaction(async (tx) => {
            // Check if user has enough wallet balance
            const userWallet = await tx.user.findUnique({
                where: { id },
                select: { wallet: true }
            });

            if (!userWallet || userWallet.wallet < amount) {
                throw new Error("Insufficient balance, please recharge your wallet");
            }

            // Deduct amount from user's wallet
            await tx.user.update({
                where: { id },
                data: { wallet: { decrement: amount } }
            });
            
            // Add listener's share to their wallet
            await tx.listener.update({
                where: { id: listenerId },
                data: { wallet: { increment: listenerShare } }
            });

            // Create transaction with SUCCESS status
            await tx.transaction.create({
                data: {
                    userId: id,
                    listenerId,
                    amount,
                    listenerShare,
                    appShare,
                    mode,
                    duration,
                    status: prisma.TransactionStatus.SUCCESS, // Enum value
                }
            });

            res.status(200).json({ message: "Transaction successful" });
        });
    } catch (error) {
        // Create transaction with FAILED status if an error occurs
        await prisma.transaction.create({
            data: {
                userId: id,
                listenerId,
                amount,
                listenerShare,
                appShare,
                mode,
                status: prisma.TransactionStatus.FAILED, // Enum value
            }
        });

        res.status(500).json({ message: error.message || "Transaction failed" });
    }
});


// @desc Update the existing user data
// @route PUT /user/updateProfile/:id
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.user; // User ID from JWT token
        const {
          name,
          sex,         // Enum: MALE or FEMALE
          drinking,    // Enum: YES or NO
          smoking,     // Enum: YES or NO
          bio,
          language,
          interests,
          relationship,
          pets,
          star_sign
        } = req.body;
    
        // Validate required inputs (optional)
        if (!id) return res.status(400).json({ error: "User ID is required" });
    
        // Update the user in the database
        const updatedUser = await prisma.user.update({
          where: { id: parseInt(id) },
          data: {
            name,
            sex,         // Enum: MALE or FEMALE
            drinking,    // Enum: YES or NO
            smoking,     // Enum: YES or NO
            bio,
            language,
            interests,
            relationship,
            pets,
            star_sign,
          },
        });
    
        return res.status(200).json({
          message: "User updated successfully",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
});

// @desc Update the existing user work data
// @route PUT /user/updateProfile/work/:id
// @access Private
const updateWork = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { work } = req.body;

        if (!id) return res.status(400).json({ error: "User ID is required" });

        const updatedWork = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                work: {
                    upsert: work.map(item => ({
                        where: {
                            userId_name: { userId: parseInt(id), name: item.name }
                        },
                        update: {
                            company: item.company,
                            position: item.position,
                            start_year: item.start_year,
                            end_year: item.end_year
                        },
                        create: {
                            userId: parseInt(id), //relation between user and user work
                            name: item.name,
                            company: item.company,
                            position: item.position,
                            start_year: item.start_year,
                            end_year: item.end_year
                        }
                    }))
                }
            }
        });

        return res.status(200).json({
            message: "User work updated successfully",
            user: updatedWork
        });
    } catch (error) {
        console.error("Error updating user work:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// @desc Update the existing user education data
// @route PUT /user/updateProfile/education/:id
// @access Private
const updateEducation = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { education } = req.body;

        if (!id) return res.status(400).json({ error: "User ID is required" });

        const updatedEducation = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                education: {
                    upsert: education.map(item => ({
                        where: {
                            userId_name: { userId: parseInt(id), name: item.name }
                        },
                        update: {
                            qualificationType: item.qualificationType,
                            institutionName: item.institutionName,
                            start_year: item.start_year,
                            end_year: item.end_year
                        },
                        create: {
                            userId: parseInt(id), //relation between user and user education
                            name: item.name,
                            qualificationType: item.qualificationType,
                            institutionName: item.institutionName,
                            start_year: item.start_year,
                            end_year: item.end_year
                        }
                    }))
                }
            }
        });

        return res.status(200).json({
            message: "User education updated successfully",
            user: updatedEducation
        });
    } catch (error) {
        console.error("Error updating user education:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// @desc Get User or Listener Details by ID
// @route GET /user/details/:id
// @access Private
const getUserOrListenerDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: { name: true, age: true, hobbies: true, language: true, image: true, about: true }
        });

        if (user) {
            return res.status(200).json(user);
        }
        const listener = await prisma.listener.findUnique({
            where: { id: parseInt(id) },
            select: { name: true, age: true, hobbies: true, language: true, image: true, about: true }
        });

        if (listener) {
            return res.status(200).json(listener);
        }

        res.status(404).json({ message: "User or Listener not found" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all transactions made by the user
// @route GET /user/transactions
// @access Private
const listUserTransactions = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get user ID from the token
    const cacheKey = `userTransactions:${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                amount: true,
                mode: true,
                status: true,
                created_at: true,
                listener: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            }
        });
        await redis.set(cacheKey, JSON.stringify(transactions), 'EX', 86400); // Cache for 1 day
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all deposits made by the user
// @route GET /user/deposits
// @access Private
const listUserDeposits = asyncHandler(async (req, res) => {
    const { id } = req.user; // Get user ID from the token
    const cacheKey = `userDeposits:${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const deposits = await prisma.deposit.findMany({
            where: { userId: id },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                amount: true,
                orderId: true,
                signatureId: true,
                mode: true,
                status: true,
                created_at: true
            }
        });
        await redis.set(cacheKey, JSON.stringify(deposits), 'EX', 86400); // Cache for 1 day
        res.status(200).json(deposits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Send Connection Request
// @route POST /user/sendConnectionRequest
// @access Private
const sendConnectionRequest = asyncHandler(async (req, res) => {
    const userId=req.user
    const {listenerId, communicationType } = req.body;

    if (!userId || !listenerId || !communicationType) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    try {
        // Check if listener is available
        const listener = await prisma.listener.findUnique({
            where: { id: listenerId, online_status: true, busy_status: false }
        });

        if (!listener) {
            return res.status(400).json({ message: "Listener is not available" });
        }

        const connectionRequest = await prisma.connectionRequest.create({
            data: {
                userId,
                listenerId,
                communicationType,
                status: 'PENDING'
            }
        });

        // Notify listener of the connection request
        io.getIo().to(listener.device_token).emit('connectionRequest', connectionRequest);

        // Set a timeout to handle missed calls
        setTimeout(async () => {
            const updatedRequest = await prisma.connectionRequest.findUnique({
                where: { id: connectionRequest.id }
            });

            if (updatedRequest.status === 'PENDING') {
                await prisma.missedCall.create({
                    data: {
                        userId,
                        listenerId,
                        mode: communicationType
                    }
                });

                await prisma.connectionRequest.update({
                    where: { id: connectionRequest.id },
                    data: { status: 'MISSED' }
                });
            }
        }, 30000); // 30 seconds

        res.status(201).json({ message: "Connection request sent", connectionRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Accept Connection Request
// @route POST /user/acceptConnectionRequest
// @access Private
const acceptConnectionRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.body;

    if (!requestId) {
        return res.status(400).json({ message: "Request ID is required" });
    }

    try {
        // Fetch the connection request details
        const connectionRequest = await prisma.connectionRequest.findUnique({
            where: { id: requestId },
            include: { listener: true } // Include listener details for validation
        });

        if (!connectionRequest) {
            return res.status(404).json({ message: "Connection request not found" });
        }

        // Validate listener's availability
        const { listener } = connectionRequest;
        if (!listener || !listener.online_status || listener.busy_status) {
            return res.status(400).json({ message: "Listener is not available" });
        }

        // Update the request status to 'ACCEPTED'
        const updatedRequest = await prisma.connectionRequest.update({
            where: { id: requestId },
            data: { status: 'ACCEPTED' }
        });

        // Emit events for user and listener
        io.getIo().to(connectionRequest.userId).emit('connectionAccepted', {
            message: "Your request has been accepted",
            connectionRequest: updatedRequest,
        });

        io.getIo().to(listener.device_token).emit('connectionReady', {
            message: "You are connected to the user",
            connectionRequest: updatedRequest,
        });

        res.status(200).json({ message: "Connection request accepted", connectionRequest: updatedRequest });
    } catch (error) {
        console.error("Error accepting connection request:", error);
        res.status(500).json({ message: error.message });
    }
});

// @desc Check if user is blocked by listener
// @route GET /user/isUserBlocked/:listenerId
// @access Private
const isUserBlockedByListener = asyncHandler(async (req, res) => {
    const { id: userId } = req.user; // Get user ID from the token
    const { listenerId } = req.params;

    try {
        const listener = await prisma.listener.findUnique({
            where: { id: parseInt(listenerId) },
            include: { blocked_users: true }
        });

        if (listener.blocked_users.some(user => user.id === parseInt(userId))) {
            return res.status(200).json({ blocked: true });
        } else {
            return res.status(200).json({ blocked: false });
        }
    } 
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    registerUser,
    loginUser,
    listListners,
    deleteUser,
    walletBalanceUsers,
    depositUser,
    transaction,
    updateProfile,
    getUserOrListenerDetails,
    updateWork,
    updateEducation,
    listUserTransactions,
    listUserDeposits,
    sendConnectionRequest,
    acceptConnectionRequest,
    isUserBlockedByListener
};


