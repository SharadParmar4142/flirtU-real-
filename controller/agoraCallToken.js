const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const generateAgoraTokens = async (req, res) => {
  try {

    //Response header 
    res.header('Access-Control-Allow-Origin', '*');

    // Extract parameters from the request body
    const { channelName, userId, listenerId, communicationType } = req.body;

    // Validate the required parameters
    if (!channelName || !userId || !listenerId || !communicationType) {
      return res.status(400).json({
        error: "channelName, userId, listenerId, and communicationType are required.",
      });
    }

    // Agora credentials
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    //Temporary console log not take to production
    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Agora credentials are missing in environment variables.",
      });
    }

    // Expiration settings
    const expirationTimeInSeconds = 3600; // Token validity: 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTimestamp = currentTimestamp + expirationTimeInSeconds;

    // Generate tokens for the user and listener
    const userToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      userId,
      RtcRole.PUBLISHER,
      privilegeExpireTimestamp
    );

    const listenerToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      listenerId,
      RtcRole.PUBLISHER,
      privilegeExpireTimestamp
    );

    // Return the tokens
    return res.status(200).json({
      userToken,
      listenerToken,
      communicationType,
    });
  } 
  catch (error) {
    console.error("Error generating Agora tokens:", error);
    return res.status(500).json({
      error: "Failed to generate Agora tokens.",
    });
  }
};

module.exports = { generateAgoraTokens };