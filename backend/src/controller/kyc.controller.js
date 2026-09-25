const asyncHandler = require("../utils/asyncHandler");
const userModel = require("../models/user.model");
const { BadRequestError, NotFoundError } = require("../utils/error");
const { getSignedUrl } = require("../utils/supabaseSignedUrl");

const KYC_DOCS_BUCKET = "kyc_bucket_dacuments";
const KYC_SELFIE_BUCKET = "kyc_selfies";

// POST /api/users/kyc
const  submitKyc = asyncHandler(async (req, res) => {
  const {
    fullName,
    dob,
    country,
    idType,
    idNumber,
    issueDate,
    expiryDate,
    issuingCountry,
    issuingAuthority,
    idAddress,
    documentUrl,
    documentBackUrl,
    selfieUrl,
    selfieFrames,
  } = req.body;

  if (!fullName || !dob || !country || !idType || !idNumber || !documentUrl || !selfieUrl) {
    throw new BadRequestError("Missing required KYC fields");
  }
  if (!["passport", "national_id", "drivers_license"].includes(idType)) {
    throw new BadRequestError("Invalid document type");
  }

  //condition for passport
  if (idType === "passport") {
    if (!issuingCountry || !issueDate || !expiryDate) {
      throw new BadRequestError("Passport requires issuing country and dates");
    }
  }

  //condition for national_id
  if (idType === "national_id") {
    if (!idAddress || !issueDate || !expiryDate) {
      throw new BadRequestError("National ID requires address and dates");
    }
    if (!documentBackUrl) {
      throw new BadRequestError("National ID requires both front and back images");
    }
  }

//condition for driver_license
  if (idType === "drivers_license") {
    if (!issuingAuthority || !issueDate || !expiryDate) {
      throw new BadRequestError("Driver's license requires issuing authority and dates");
    }
    if (!documentBackUrl) {
      throw new BadRequestError("Driver's license requires both front and back images");
    }
  }


  const profile = await userModel.getProfileByWallet(req.walletAddress);
  if (!profile) throw new BadRequestError("Profile not found");
  if (profile.kyc_status === "approved") throw new BadRequestError("KYC already approved");
  if (profile.kyc_status === "pending" && profile.kyc_submitted_at) {
    throw new BadRequestError("KYC already under review");
  }

  const updated = await userModel.submitKyc(req.walletAddress, {
    fullName,
    dob,
    country,
    idType,
    idNumber,
    issueDate,
    expiryDate,
    issuingCountry,
    issuingAuthority,
    idAddress,
    documentUrl,
    documentBackUrl,
    selfieUrl,
    selfieFrames,
  });

  res.status(201).json({ profile: updated });
});



const getKycStatus = asyncHandler(async (req, res) => {
  const p = await userModel.getProfileByWallet(req.walletAddress);
  res.json({
    status: p?.kyc_status || "not_started",
    submittedAt: p?.kyc_submitted_at || null,
    reviewedAt: p?.kyc_reviewed_at || null,
    rejectionReason: p?.kyc_rejection_reason || null,
  });
});


const listPending = asyncHandler(async (req, res) => {
  const pending = await userModel.listPendingKyc();
  res.json({ pending });
});



const getSignedUrlForKyc = asyncHandler(async (req, res) => {
  const { walletAddress, field } = req.query;
  if (!walletAddress || !["document", "document_back", "selfie"].includes(field)) {
    throw new BadRequestError(
      "walletAddress and field (document|document_back|selfie) required"
    );
  }
  const profile = await userModel.getProfileByWallet(walletAddress);
  if (!profile) throw new NotFoundError("Profile not found");

  const map = {
    document: { bucket: KYC_DOCS_BUCKET, url: profile.kyc_document_url },
    document_back: { bucket: KYC_DOCS_BUCKET, url: profile.kyc_document_back_url },
    selfie: { bucket: KYC_SELFIE_BUCKET, url: profile.kyc_selfie_url },
  };
  const target = map[field];
  if (!target.url) throw new NotFoundError("No file for this field");

  const signedUrl = await getSignedUrl(target.bucket, target.url, 900);
  if (!signedUrl) throw new NotFoundError("Could not sign URL");

  res.json({ url: signedUrl });
});


const decide = asyncHandler(async (req, res) => {
  const { walletAddress, status, reason } = req.body;

  if (!["approved", "rejected", "reset"].includes(status)) {
    throw new BadRequestError("Invalid decision");
  }
  if (status === "rejected" && !reason) {
    throw new BadRequestError("Reason required for rejection");
  }

  const updated = await userModel.setKycDecision(walletAddress, {
    status,
    reason,
    reviewerWallet: req.walletAddress,
  });

  res.json({ profile: updated });
});



module.exports = {submitKyc, getKycStatus, listPending, getSignedUrlForKyc, decide };