import expressAsyncHandler from 'express-async-handler';
import SupportMessage from '../models/support.model.js';
import AppError from '../utils/error.utils.js';
import { sendEmail } from '../utils/sendEmail.js';

// Create a new support message
export const createSupportMessage = expressAsyncHandler(async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;

    // Create new support message
    const supportMessage = await SupportMessage.create({
      name,
      email,
      phone,
      message
    });

    // Send confirmation email to user
    await sendEmail(
      email,
      'Support Request Received - NeuraCampus',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B8E;">Thank you for contacting NeuraCampus Support!</h2>
          <p>Dear ${name},</p>
          <p>We have received your support request and will get back to you within 24 hours.</p>
          <p><strong>Your message:</strong></p>
          <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
          <p>If you need immediate assistance, please call us at 925-500-5051.</p>
          <p>Best regards,<br>NeuraCampus Support Team</p>
        </div>
      `
    );

    // Send notification to support team
    await sendEmail(
      'neuracampus@outlook.com',
      'New Support Request',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B8E;">New Support Request</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
          <p>Please respond to this request as soon as possible.</p>
        </div>
      `
    );

    res.status(201).json({
      success: true,
      message: 'Support message sent successfully',
      data: supportMessage
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to send support message', 500));
  }
});

// Get all support messages (admin/support team only)
export const getAllSupportMessages = expressAsyncHandler(async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const messages = await SupportMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('respondedBy', 'fullName email');

    const total = await SupportMessage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        messages,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMessages: total
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch support messages', 500));
  }
});

// Get support message by ID
export const getSupportMessageById = expressAsyncHandler(async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await SupportMessage.findById(messageId)
      .populate('respondedBy', 'fullName email');

    if (!message) {
      return next(new AppError('Support message not found', 404));
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch support message', 500));
  }
});

// Update support message status and add response
export const respondToSupportMessage = expressAsyncHandler(async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { status, response } = req.body;
    const respondedBy = req.user?.id;

    if (!respondedBy) {
      return next(new AppError('Not authorized', 401));
    }

    const message = await SupportMessage.findById(messageId);
    if (!message) {
      return next(new AppError('Support message not found', 404));
    }

    // Update message
    message.status = status || message.status;
    if (response) {
      message.response = response;
      message.respondedBy = respondedBy;
      message.respondedAt = new Date();

      // Send response email to user
      await sendEmail({
        email: message.email,
        subject: 'Response from NeuraCampus Support',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #003B8E;">NeuraCampus Support Response</h2>
            <p>Dear ${message.name},</p>
            <p><strong>Your message:</strong></p>
            <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${message.message}</p>
            <p><strong>Our response:</strong></p>
            <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${response}</p>
            <p>If you need further assistance, please don't hesitate to contact us.</p>
            <p>Best regards,<br>NeuraCampus Support Team</p>
          </div>
        `
      });
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Support message updated successfully',
      data: message
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to update support message', 500));
  }
}); 