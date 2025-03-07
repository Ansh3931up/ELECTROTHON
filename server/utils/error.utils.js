class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Handle MongoDB connection errors specifically
    if (message.includes('ENOTFOUND') && message.includes('mongodb')) {
      this.statusCode = 503; // Service Unavailable
      this.message = 'Unable to connect to database. Please try again later.';
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
