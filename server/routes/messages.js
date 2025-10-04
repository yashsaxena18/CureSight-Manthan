const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const verifyToken = require('../middleware/authmiddleware');

// Get chat history between doctor and patient
router.get('/patients/:patientId/messages', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId;

    console.log(`📬 Fetching chat history: Doctor ${doctorId} ↔ Patient ${patientId}`);

    const messages = await Message.getChatHistory(doctorId, patientId, 100);
    
    // Add sender names
    const messagesWithNames = messages.reverse().map(msg => ({
      ...msg.toObject(),
      senderName: msg.sender.role === 'doctor' 
        ? `Dr. ${msg.sender.firstName} ${msg.sender.lastName}`
        : `${msg.sender.firstName} ${msg.sender.lastName}`
    }));

    console.log(`✅ Found ${messagesWithNames.length} messages`);

    res.json({
      success: true,
      messages: messagesWithNames,
      count: messagesWithNames.length
    });

  } catch (error) {
    console.error('❌ Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
});

// Send new message
router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { recipient, content, type = 'text', prescriptionData, attachments } = req.body;
    const senderId = req.user.userId;
    const senderType = req.user.role;

    console.log(`💬 Saving message: ${senderType} ${senderId} → ${recipient}`);

    // Validate recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create message
    const newMessage = new Message({
      sender: senderId,
      recipient,
      senderType,
      content,
      type,
      prescriptionData,
      attachments,
      status: 'sent',
      deliveredAt: new Date()
    });

    const savedMessage = await newMessage.save();

    // Populate sender info
    await savedMessage.populate('sender', 'firstName lastName role');
    await savedMessage.populate('recipient', 'firstName lastName role');

    console.log(`✅ Message saved: ${savedMessage._id}`);

    res.json({
      success: true,
      message: {
        ...savedMessage.toObject(),
        senderName: savedMessage.sender.role === 'doctor'
          ? `Dr. ${savedMessage.sender.firstName} ${savedMessage.sender.lastName}`
          : `${savedMessage.sender.firstName} ${savedMessage.sender.lastName}`
      }
    });

  } catch (error) {
    console.error('❌ Error saving message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Mark message as read
router.patch('/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only recipient can mark as read
    if (message.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read'
      });
    }

    message.read = true;
    message.readAt = new Date();
    message.status = 'read';
    await message.save();

    console.log(`👀 Message marked as read: ${messageId}`);

    res.json({
      success: true,
      message: 'Message marked as read',
      readAt: message.readAt
    });

  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

// Get unread message count
router.get('/messages/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Message.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

module.exports = router;
