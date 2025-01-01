const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const prisma = new PrismaClient();
const redis = new Redis();
const cron = require('node-cron');

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

// Schedule a task to run at the start of every month
cron.schedule('0 0 1 * *', async () => {
    try {
        await prisma.listener.updateMany({  
            data: { leaveAvailable: 4 }
        });
        console.log('Leave available reset for all listeners');
    } catch (error) {
        console.error('Error resetting leave available:', error);
    }
});

// Schedule a task to run every week to remove all entries in ConnectionRequest
cron.schedule('0 0 * * 0', async () => {
    try {
        await prisma.connectionRequest.deleteMany({});
        console.log('All connection requests removed');
    } catch (error) {
        console.error('Error removing connection requests:', error);
    }
});

//@desc List all users
//@route GET /admin/listUser
//@access private
const listUser = asyncHandler(async (req, res) => {
    const cacheKey = 'listUser';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const users = await prisma.user.findMany();
        await redis.set(cacheKey, JSON.stringify(users), 'EX', 86400); // Cache for 1 day
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//@desc List all listeners
//@route GET /admin/listners
//@access private
const listListners = asyncHandler(async (req, res) => {
    const cacheKey = 'listListeners';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const listeners = await prisma.listener.findMany();
        await redis.set(cacheKey, JSON.stringify(listeners), 'EX', 86400); // Cache for 1 day
        res.status(200).json(listeners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//@desc List blocked users
//@route GET /admin/blockedUses
//@access private
const blockedUsers = asyncHandler(async (req, res) => {
    const cacheKey = 'blockedUsers';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const blockedUsers = await prisma.blockedUsers.findMany({
            include: {
                listener: true,
                user: true
            }
        });
        await redis.set(cacheKey, JSON.stringify(blockedUsers), 'EX', 86400); // Cache for 1 day
        res.status(200).json(blockedUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//@desc Get wallet balance of users
//@route GET /admin/walletBalance/users
//@access private
const walletBalanceUsers = asyncHandler(async (req, res) => {
    const cacheKey = 'walletBalanceUsers';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
    }

    try {
        const users = await prisma.user.findMany({
            select: { id, wallet }
        });
        await redis.set(cacheKey, JSON.stringify(users), 'EX', 86400); // Cache for 1 day
        res.status(200).json(users);
    } catch (error) {
        res.status (500).json({ message: error.message });
    }
});

//@desc Get wallet balance of listeners
//@route GET /admin/walletBalance/Listners
//@access private
const walletBalanceListners = asyncHandler(async (req, res) => {
    const listeners = await prisma.listener.findMany({
        select: { id, wallet }
    });
    res.status(200).json(listeners);
});

// @desc List all pending withdrawal requests
// @route GET /admin/withdrawalRequests
// @access Private
const listWithdrawalRequests = asyncHandler(async (req, res) => {
    try {
        const requests = await prisma.withdraw.findMany({
            where: { requestApproveAdmin: 'WAITING' },
            include: { listener: true }
        });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Approve or Reject a withdrawal request
// @route POST /admin/withdrawalRequests/:id
// @access Private
const handleWithdrawalRequest = asyncHandler(async (req, res) => {
    const { id } = req.params; // Withdrawal request ID
    const { approve } = req.body; // Boolean to approve or reject

    try {
        const request = await prisma.withdraw.findUnique({
            where: { id: parseInt(id) },
            include: { listener: true }
        });

        if (!request) {
            return res.status(404).json({ message: "Withdrawal request not found" });
        }

        if (approve) {
            await prisma.$transaction(async (tx) => {
                // Update withdrawal request to SUCCESS
                await tx.withdraw.update({
                    where: { id: parseInt(id) },
                    data: {
                        requestApproveAdmin: 'TRUE',
                        status: 'SUCCESS'
                    }
                });

                    //make payment  PAYMENT API

                res.status(200).json({ message: "Withdrawal request approved" });
            });
        } else {
            await prisma.$transaction(async (tx) => {
                // Update withdrawal request to FAILED
                await tx.withdraw.update({
                    where: { id: parseInt(id) },
                    data: {
                        requestApproveAdmin: 'FALSE',
                        status: 'FAILED'
                    }
                });

                // Refund the amount to listener's wallet
                await tx.listener.update({
                    where: { id: request.listenerId },
                    data: { wallet: { increment: request.amount } }
                });

                res.status(200).json({ message: "Withdrawal request rejected and amount refunded" });
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all profile update requests
// @route GET /admin/profileUpdateRequests
// @access Private
const listProfileUpdateRequests = asyncHandler(async (req, res) => {
    try {
        const requests = await prisma.pendingProfile.findMany({
            where: { listener: { updateProfile: 'WAITING' } },
            include: { listener: true }
        });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Handle profile update request
// @route POST /admin/profileUpdateRequests/:id
// @access Private
const handleProfileUpdateRequest = asyncHandler(async (req, res) => {
    const { id } = req.params; // Listener ID
    const { approve } = req.body; // Boolean to approve or reject

    try {
        const request = await prisma.pendingProfile.findUnique({
            where: { listenerId: parseInt(id) },
            include: { listener: true }
        });

        if (!request) {
            return res.status(404).json({ message: "Profile update request not found" });
        }

        if (approve) {
            await prisma.$transaction(async (tx) => {
                // Update listener profile with pending changes
                await tx.listener.update({
                    where: { id: parseInt(id) },
                    data: {
                        image: request.image,
                        language: request.language,
                        favoriteFood: request.favoriteFood,
                        hobbies: request.hobbies,
                        idols: request.idols,
                        about: request.about,
                        updateProfile: 'TRUE'
                    }
                });

                // Delete pending profile request
                await tx.pendingProfile.delete({
                    where: { listenerId: parseInt(id) }
                });

                res.status(200).json({ message: "Profile update request approved" });
            });
        } else {
            // Reject request
            await prisma.listener.update({
                where: { id: parseInt(id) },
                data: { updateProfile: 'FALSE' }
            });

            // Delete profile request
            await prisma.pendingProfile.delete({
                where: { listenerId: parseInt(id) }
            });

            res.status(200).json({ message: "Profile update request rejected" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Register a Listener
// @route POST /admin/registerListener
// @access Private
const registerListener = asyncHandler(async (req, res) => {
    const { name, email, image, age, language, favoriteFood, hobbies, idols, sex, about, device_token } = req.body;

    // Validate required fields
    if (!name || !email || !age || !language || !sex || !device_token) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    try {
        const listener = await prisma.listener.create({
            data: { name, email, image, age, language, favoriteFood, hobbies, idols, sex, about, device_token }
        });
        res.status(201).json(listener);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Update listener profile
// @route PUT /admin/updateListenerProfile/:id
// @access Private
const updateListenerProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, age, language, favoriteFood, hobbies, idols, sex, about, device_token } = req.body;

    try {
        const updatedListener = await prisma.listener.update({
            where: { id: parseInt(id) },
            data: { name, email, age, language, favoriteFood, hobbies, idols, sex, about, device_token }
        });
        res.status(200).json(updatedListener);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Update listener profile image
// @route PUT /admin/updateListenerProfileImage/:id
// @access Private
const updateListenerProfileImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { image } = req.body;


    //middleware S3 bucket to upload image
    id->database image ->delete image from database
    update image in S3 
    ->link

    S3-> image link
     (replace link)

    try {
        const updatedListener = await prisma.listener.update({
            where: { id: parseInt(id) },
            data: { image }
        });
        res.status(200).json(updatedListener);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


ON HOLD THE COMMON PART
// show duration and mode and datetime, 
// user-> amount 
// listener_shareofamount
// user andz corresponding listener(common)
// @desc List all transactions of all users
// @route GET /admin/transactions/users
// @access Private
// const listAllUserTransactions = asyncHandler(async (req, res) => {
//     try {
//         const transactions = await prisma.transaction.findMany({
//             where: { userId: { not: null }},
//             orderBy: { created_at: 'desc' },
//             include: {
//                 user: {
//                     select: {
//                         id: true,
//                         name: true,
//                         image: true
//                     }
//                 },
//                 listener: {
//                     select: {
//                         id: true,
//                         name: true,
//                         image: true
                        
//                     }
//                 }
//             }
//         });
//         res.status(200).json(transactions);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });


//ON HOLD THE COMMON PART*********************************************

sdvsdv
// @desc List all transactions of all listeners
// @route GET /admin/transactions/listeners
// @access Private
const listAllListenerTransactions = asyncHandler(async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { listenerId: { not: null } },
            orderBy: { created_at: 'desc' },
            include: {
                listener: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        email: true,
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

// @desc List all transactions of a particular user by ID
// @route GET /admin/transactions/user/:id
// @access Private
const listUserTransactionsById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: parseInt(id),
            },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                listener: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                mode: true,
                duration: true,
                amount: true,
                created_at: true
            }
        });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all transactions of a particular listener by ID
// @route GET /admin/transactions/listener/:id/:email
// @access Private
const listListenerTransactionsById = asyncHandler(async (req, res) => {
    const { id} = req.params;
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                listenerId: parseInt(id),
            },
            orderBy: { created_at: 'desc' },
            include: {
                listener: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        email: true,
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

// @desc List all deposits
// @route GET /admin/deposits
// @access Private
const listAllDeposits = asyncHandler(async (req, res) => {
    try {
        const deposits = await prisma.deposit.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        amount: true,
                        date: true
                    }
                }
            }
        });
        res.status(200).json(deposits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List deposits by user ID
// @route GET /admin/deposits/user/:id
// @access Private
const listDepositsByUserId = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const deposits = await prisma.deposit.findMany({
            where: { userId: parseInt(id) },
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        amount: true,
                        date: true,
                        signature_id: true
                    }
                }
            }
        });
        res.status(200).json(deposits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all withdrawals
// @route GET /admin/withdrawals
// @access Private
const listAllWithdrawals = asyncHandler(async (req, res) => {
    try {
        const withdrawals = await prisma.withdraw.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                listener: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        amount: true,
                        date: true
                    }
                }
            }
        });
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List withdrawals by listener ID
// @route GET /admin/withdrawals/listener/:id
// @access Private
const listWithdrawalsByListenerId = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const withdrawals = await prisma.withdraw.findMany({
            where: { listenerId: parseInt(id) },
            orderBy: { created_at: 'desc' },
            include: {
                listener: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true,
                        amount: true,
                        date: true
                    }
                }
            }
        });
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Approve or reject leave request
// @route POST /admin/approveLeaveRequest/:id
// @access Private
const approveLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params; // Leave request listener ID
    const { approve } = req.body; // Boolean to approve or reject

    try {
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: parseInt(id) },
            include: { listener: true }
        });

        if (!leaveRequest) {
            return res.status(404).json({ message: "Leave request not found" });
        }

        if (approve) {
            await prisma.listener.update({
                where: { id: leaveRequest.listenerId },
                data: { leaveAvailable: { decrement: leaveRequest.days } }
            });

            await prisma.leaveRequest.update({
                where: { id: parseInt(id) },
                data: { status: 'APPROVED' }
            });

            res.status(200).json({ message: "Leave request approved" });
        } else {
            await prisma.leaveRequest.update({
                where: { id: parseInt(id) },
                data: { status: 'REJECTED' }
            });

            res.status(200).json({ message: "Leave request rejected" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc List all leave requests
// @route GET /admin/leaveRequests
// @access Private
const listLeaveRequests = asyncHandler(async (req, res) => {
    try {
        const leaveRequests = await prisma.leaveRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                listener: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(200).json(leaveRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Apply leave penalty for a listener
// @route POST /admin/applyLeavePenalty/:id
// @access Private
const applyLeavePenalty = asyncHandler(async (req, res) => {
    const { id } = req.params; // Listener ID
    const { days } = req.body;

    if (!days) {
        return res.status(400).json({ message: "Days are required" });
    }

    try {
        const listener = await prisma.listener.findUnique({
            where: { id: parseInt(id) },
            select: { leaveAvailable, wallet }
        });

        if (listener.leaveAvailable < days) {
            await prisma.penalty.create({
                data: {
                    listenerId: parseInt(id),
                    penaltyMode: 'TRUANCY',
                    amount: 50 //update later
                }
            });

            await prisma.listener.update({
                where: { id: parseInt(id) },
                data: { wallet: { decrement: 50 } }
            });

            res.status(200).json({ message: "Leave taken without approval, penalty applied" });
        } else {
            res.status(400).json({ message: "Listener has enough leave available, no need to apply penalty" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Schedule a meeting
// @route POST /admin/scheduleMeeting
// @access Private
const scheduleMeeting = asyncHandler(async (req, res) => {
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
        return res.status(400).json({ message: "Scheduled date and time are required" });
    }

    try {
        const listeners = await prisma.listener.findMany({
            where: { ac_delete: false }
        });

        const missedMeetings = [];

        for (const listener of listeners) {
            const missedMeeting = await prisma.missedMeeting.create({
                data: {
                    listenerId: listener.id,
                    scheduledAt: new Date(scheduledAt)
                }
            });
            missedMeetings.push(missedMeeting);
        }

        res.status(200).json({ message: "Meeting scheduled", missedMeetings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc Penalize listeners who missed the meeting
// @route POST /admin/penalizeMissedMeetings
// @access Private
const penalizeMissedMeetings = asyncHandler(async (req, res) => {
    try {
        const missedMeetings = await prisma.missedMeeting.findMany({
            where: {
                scheduledAt: { gte: new Date(new Date().setDate(new Date().getDate() - 1)) }, // Assuming penalizing for meetings missed in the last day
                attended: false
            },
            include: {
                penalties: true
            }
        });

        const penalties = [];

        for (const missedMeeting of missedMeetings) {
            if (missedMeeting.penalties.length === 0) { // Check if no penalty has been applied
                const penalty = await prisma.penalty.create({
                    data: {
                        listenerId: missedMeeting.listenerId,
                        penaltyMode: 'MISSED_MEETING',
                        amount: 50
                    }
                });
                penalties.push(penalty);

                await prisma.listener.update({
                    where: { id: missedMeeting.listenerId },
                    data: { wallet: { decrement: 50 } }
                });
            }
        }

        res.status(200).json({ message: "Penalties applied", penalties });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    listUser,
    listListners,
    blockedUsers,
    walletBalanceUsers,
    walletBalanceListners,
    listWithdrawalRequests,
    handleWithdrawalRequest,
    listProfileUpdateRequests,
    handleProfileUpdateRequest,
    registerListener,
    updateListenerProfile,
    updateListenerProfileImage,
    listAllUserTransactions,  //on hold
    listAllListenerTransactions,
    listUserTransactionsById,
    listListenerTransactionsById,
    listAllDeposits,
    listDepositsByUserId,
    listAllWithdrawals,
    listWithdrawalsByListenerId,
    approveLeaveRequest,
    listLeaveRequests,
    applyLeavePenalty,
    scheduleMeeting,
    penalizeMissedMeetings
};




