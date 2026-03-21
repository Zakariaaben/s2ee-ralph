import { Schema } from "effect";

import { CompanyId } from "../company";
import { CvProfileId } from "../cv-profile";
import { StudentId } from "../student";
import { GlobalInterviewTag } from "../vocabulary";
import { CompanyInterviewTag } from "./company-interview-tag";
import { InterviewId } from "./interview-id";
import { InterviewStatus } from "./interview-status";

export class Interview extends Schema.Class<Interview>("Interview")({
  id: InterviewId,
  companyId: CompanyId,
  studentId: StudentId,
  cvProfileId: CvProfileId,
  recruiterName: Schema.String,
  status: InterviewStatus,
  score: Schema.NullOr(Schema.Number),
  globalTags: Schema.Array(GlobalInterviewTag),
  companyTags: Schema.Array(CompanyInterviewTag),
}) {}
