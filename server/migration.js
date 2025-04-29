import mongoose from "mongoose";
import { config } from "dotenv";
import User from "./models/user.model.js";

config();

const migrateClassIds = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Update all documents at once
    const result = await User.updateMany(
      {}, // match all documents
      [
        {
          $set: {
            classId: {
              $cond: {
                if: { $isArray: "$classId" },
                then: "$classId",
                else: {
                  $cond: {
                    if: { $eq: ["$classId", null] },
                    then: [],
                    else: ["$classId"]
                  }
                }
              }
            }
          }
        }
      ]
    );

    console.log(`Modified ${result.modifiedCount} documents`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

migrateClassIds();