import { Schema, model } from "mongoose";

const classSchema = new Schema(

  {
    className:{
        type: String,
        required: true
    },
    frequency: [
      {
        type: String,
        required: true,
        length: [1, "# generated frequency"],
      },
    ],
    teacherId: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    studentList: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    time: {
        type:Date
    },
    attendance:[
        {
            date:{
                type: Date
            },
            presentStudents:[
                {
                    type: Schema.Types.ObjectId,
                    ref:"Student"
                }
            ]
        }
    ]
  },
  {
    timestamps: true,
  }
);

const Class = model("Class", classSchema);

export default Class;
