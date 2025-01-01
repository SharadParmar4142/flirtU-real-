const { RtmTokenBuilder } = require("agora-access-token");

const generateChatTokens = async (req, res) => {
  try {
    // Response header
    res.header("Access-Control-Allow-Origin", "*");

    // Extract parameters from the request body
    const { userId, listenerId } = req.body;

    // Validate the required parameters
    if (!userId || !listenerId) {
      return res.status(400).json({
        error: "userId and listenerId are required.",
      });
    }

    // Agora credentials
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Agora credentials are missing in environment variables.",
      });
    }

    // Expiration settings
    const expirationTimeInSeconds = 3600; // Token validity: 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTimestamp = currentTimestamp + expirationTimeInSeconds;

    // Generate RTM tokens for the user and listener
    const userRtmToken = RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      userId,
      RtmTokenBuilder.Role.Rtm_User,
      privilegeExpireTimestamp
    );

    const listenerRtmToken = RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      listenerId,
      RtmTokenBuilder.Role.Rtm_User,    
      privilegeExpireTimestamp
    );

    // Return the tokens
    return res.status(200).json({
      userRtmToken,
      listenerRtmToken,
    });
  } 
  catch (error) {
    console.error("Error generating RTM tokens:", error);
    return res.status(500).json({
      error: "Failed to generate RTM tokens.",
    });
  }
};

module.exports = { generateChatTokens };
