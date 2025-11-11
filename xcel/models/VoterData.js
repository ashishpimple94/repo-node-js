import mongoose from 'mongoose';

const voterDataSchema = new mongoose.Schema(
  {
    // Existing fields
    serialNumber: {
      type: String,
      required: false,
    },
    houseNumber: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
      comment: 'Name in English'
    },
    name_mr: {
      type: String,
      required: false,
      comment: 'Name in Marathi (मराठी नाव)'
    },
    gender: {
      type: String,
      required: false,
    },
    gender_mr: {
      type: String,
      required: false,
      comment: 'Gender in Marathi (लिंग)'
    },
    age: {
      type: Number,
      required: false,
    },
    voterIdCard: {
      type: String,
      required: false,
    },
    mobileNumber: {
      type: String,
      required: false,
    },
    // New fields from PDF
    AC_NO: {
      type: String,
      required: false,
    },
    PART_NO: {
      type: String,
      required: false,
    },
    SLNOINPART: {
      type: String,
      required: false,
    },
    C_HOUSE_NO: {
      type: String,
      required: false,
    },
    SECTION_NO: {
      type: String,
      required: false,
    },
    RLN_TYPE: {
      type: String,
      required: false,
    },
    EPIC_NO: {
      type: String,
      required: false,
    },
    DOB: {
      type: String,
      required: false,
    },
    FM_NAME_EN: {
      type: String,
      required: false,
      comment: 'First/Middle Name in English'
    },
    MN_NAME_EN: {
      type: String,
      required: false,
      comment: 'Middle Name in English'
    },
    LASTNAME_EN: {
      type: String,
      required: false,
      comment: 'Last Name in English'
    },
    RLN_FM_NM_EN: {
      type: String,
      required: false,
      comment: 'Relation First/Middle Name in English'
    },
    RLN_L_NM_EN: {
      type: String,
      required: false,
      comment: 'Relation Last Name in English'
    },
    FM_NAME_V1: {
      type: String,
      required: false,
      comment: 'First/Middle Name in Vernacular (V1)'
    },
    LASTNAME_V1: {
      type: String,
      required: false,
      comment: 'Last Name in Vernacular (V1)'
    },
    RLN_FM_NM_V1: {
      type: String,
      required: false,
      comment: 'Relation First/Middle Name in Vernacular (V1)'
    },
    RLN_L_NM_V1: {
      type: String,
      required: false,
      comment: 'Relation Last Name in Vernacular (V1)'
    },
    C_HOUSE_NO_V1: {
      type: String,
      required: false,
      comment: 'House Number in Vernacular (V1)'
    },
    adr1: {
      type: String,
      required: false,
      comment: 'Address Line 1'
    },
    adr2: {
      type: String,
      required: false,
      comment: 'Address Line 2'
    },
    POLLING_STATION_ADR1: {
      type: String,
      required: false,
      comment: 'Polling Station Address Line 1'
    },
    POLLING_STATION_ADR2: {
      type: String,
      required: false,
      comment: 'Polling Station Address Line 2'
    },
    pp: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const VoterData = mongoose.model('VoterData', voterDataSchema);

export default VoterData;

