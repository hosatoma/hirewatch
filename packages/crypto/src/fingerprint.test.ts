import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createCandidateStateFingerprint,
} from "./fingerprint.js";


describe(
  "createCandidateStateFingerprint",
  () => {
    it("同じ状態なら固定されたfingerprintになる", () => {
      const result =
        createCandidateStateFingerprint({
          stage: "一次面接済",
          waitingOn: "interviewer",
          dueDate: "2026-09-02",
          recruiter: "山田",
        });

      expect(result).toBe(
        "3e7fad646d391cf741a5365c8f3844be5635f4a43e3b1e3fa53030ee1b713d71",
      );
    });


    it("Stageが変わればfingerprintも変わる", () => {
      const before =
        createCandidateStateFingerprint({
          stage: "一次面接済",
          waitingOn: "interviewer",
        });

      const after =
        createCandidateStateFingerprint({
          stage: "二次面接",
          waitingOn: "candidate",
        });

      expect(before).not.toBe(after);
    });


    it("前後の空白を正規化する", () => {
      const first =
        createCandidateStateFingerprint({
          stage: "一次面接済",
          waitingOn: "interviewer",
          recruiter: "山田",
        });

      const second =
        createCandidateStateFingerprint({
          stage: " 一次面接済 ",
          waitingOn: " interviewer ",
          recruiter: " 山田 ",
        });

      expect(first).toBe(second);
    });


    it("undefinedと空文字を同一視する", () => {
      const first =
        createCandidateStateFingerprint({
          stage: "一次面接済",
        });

      const second =
        createCandidateStateFingerprint({
          stage: "一次面接済",
          recruiter: "   ",
        });

      expect(first).toBe(second);
    });
  },
);