import {
  normalizeCadastralId,
  isValidCadastralId,
  validateCadastralId,
  ESTONIAN_CADASTRAL_ID_LENGTH,
  type CadastralId,
  type CadastralIdErrorCode,
} from "./types";

describe("cadastral identifier validation (KT-030)", () => {
  describe("ESTONIAN_CADASTRAL_ID_LENGTH", () => {
    test("is 12", () => {
      expect(ESTONIAN_CADASTRAL_ID_LENGTH).toBe(12);
    });
  });

  describe("normalizeCadastralId", () => {
    test("trims leading and trailing whitespace", () => {
      expect(normalizeCadastralId("  412010040110  ")).toBe("412010040110");
    });

    test("removes colons", () => {
      expect(normalizeCadastralId("41201:004:0110")).toBe("412010040110");
    });

    test("removes hyphens", () => {
      expect(normalizeCadastralId("41201-004-0110")).toBe("412010040110");
    });

    test("removes dots", () => {
      expect(normalizeCadastralId("41201.004.0110")).toBe("412010040110");
    });

    test("removes spaces", () => {
      expect(normalizeCadastralId("41201 004 0110")).toBe("412010040110");
    });

    test("removes mixed separators", () => {
      expect(normalizeCadastralId("41201: 004.0110")).toBe("412010040110");
    });

    test("normalizes the standard MaRu example", () => {
      expect(normalizeCadastralId("78401:101:3143")).toBe("784011013143");
    });

    test("normalizes another colon-delimited example", () => {
      expect(normalizeCadastralId("40302:001:0238")).toBe("403020010238");
    });

    test("preserves already-normalized 12-digit id", () => {
      expect(normalizeCadastralId("412010040110")).toBe("412010040110");
    });

    test("preserves already-normalized 10-digit id without validation", () => {
      expect(normalizeCadastralId("1234567890")).toBe("1234567890");
    });

    test("does not mutate the original argument", () => {
      const input = "  41201:004:0110  ";
      normalizeCadastralId(input);
      expect(input).toBe("  41201:004:0110  ");
    });
  });

  describe("validateCadastralId", () => {
    describe("success cases", () => {
      test("accepts a bare 12-digit id", () => {
        const result = validateCadastralId("412010040110");
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts a colon-delimited 12-digit id (5:3:4)", () => {
        const result = validateCadastralId("41201:004:0110");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts a hyphen-delimited 12-digit id", () => {
        const result = validateCadastralId("41201-004-0110");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts a dot-delimited 12-digit id", () => {
        const result = validateCadastralId("41201.004.0110");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts a space-delimited 12-digit id", () => {
        const result = validateCadastralId("41201 004 0110");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts an id with surrounding whitespace", () => {
        const result = validateCadastralId("  41201:004:0110  ");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("412010040110");
      });

      test("accepts a second official MaRu example", () => {
        const result = validateCadastralId("78401:101:3143");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("784011013143");
      });

      test("accepts a third example (Tallinn area)", () => {
        const result = validateCadastralId("40302:001:0238");
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe("403020010238");
      });
    });

    describe("type errors", () => {
      test("rejects null with INVALID_TYPE", () => {
        const result = validateCadastralId(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
        expect(result.errors[0].field).toBe("cadastralId");
        expect(result.normalized).toBeUndefined();
      });

      test("rejects undefined with INVALID_TYPE", () => {
        const result = validateCadastralId(undefined);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });

      test("rejects number with INVALID_TYPE", () => {
        const result = validateCadastralId(123456789012);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });

      test("rejects boolean with INVALID_TYPE", () => {
        const result = validateCadastralId(true);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });

      test("rejects object with INVALID_TYPE", () => {
        const result = validateCadastralId({ id: "412010040110" });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });

      test("rejects array with INVALID_TYPE", () => {
        const result = validateCadastralId(["412010040110"]);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });
    });

    describe("empty input", () => {
      test("rejects empty string with EMPTY", () => {
        const result = validateCadastralId("");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("EMPTY");
      });

      test("rejects whitespace-only string with EMPTY", () => {
        const result = validateCadastralId("   ");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("EMPTY");
      });

      test("rejects colons-only string with EMPTY", () => {
        const result = validateCadastralId(":::");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("EMPTY");
      });

      test("rejects hyphens-only string with EMPTY", () => {
        const result = validateCadastralId("---");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("EMPTY");
      });
    });

    describe("invalid characters", () => {
      test("rejects letters with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("41201004AB10");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });

      test("rejects letters in colon-delimited form with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("41201:004:AB10");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });

      test("rejects special characters with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("412010040110!");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });

      test("rejects forward slashes with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("41201/004/0110");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });

      test("rejects commas with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("41201,004,0110");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });

      test("rejects plus sign with INVALID_CHARACTERS", () => {
        const result = validateCadastralId("+41201004011");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_CHARACTERS");
      });
    });

    describe("wrong length (after normalization)", () => {
      test("rejects fewer than 12 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("4120100401");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects 11 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("41201004011");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects 5 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("12345");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects 10 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("1234567890");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects more than 12 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("4120100401100");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects 20 digits with WRONG_LENGTH", () => {
        const result = validateCadastralId("12345678901234567890");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });

      test("rejects colon-delimited with wrong total digits", () => {
        const result = validateCadastralId("412:004:0110");
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("WRONG_LENGTH");
      });
    });

    describe("error message content", () => {
      test("WRONG_LENGTH message includes expected and actual length", () => {
        const result = validateCadastralId("12345");
        const error = result.errors.find((e) => e.code === "WRONG_LENGTH");
        expect(error).toBeDefined();
        expect(error!.message).toContain(String(ESTONIAN_CADASTRAL_ID_LENGTH));
        expect(error!.message).toContain("5");
      });
    });
  });

  describe("isValidCadastralId (delegates to validateCadastralId)", () => {
    test("returns true for valid 12-digit id", () => {
      expect(isValidCadastralId("412010040110")).toBe(true);
    });

    test("returns true for colon-delimited 12-digit id", () => {
      expect(isValidCadastralId("41201:004:0110")).toBe(true);
      expect(isValidCadastralId("78401:101:3143")).toBe(true);
    });

    test("returns true for whitespace-padded id", () => {
      expect(isValidCadastralId("  41201:004:0110  ")).toBe(true);
    });

    test("returns false for empty string", () => {
      expect(isValidCadastralId("")).toBe(false);
    });

    test("returns false for id with letters", () => {
      expect(isValidCadastralId("41201004AB10")).toBe(false);
    });

    test("returns false for too-short id", () => {
      expect(isValidCadastralId("12345")).toBe(false);
      expect(isValidCadastralId("1234567890")).toBe(false);
    });

    test("returns false for too-long id", () => {
      expect(isValidCadastralId("1234567890123456")).toBe(false);
    });

    test("returns false for special characters", () => {
      expect(isValidCadastralId("412010040110!")).toBe(false);
      expect(isValidCadastralId("41201/004/0110")).toBe(false);
    });

    test("delegates to validateCadastralId for type errors (non-string)", () => {
      // isValidCadastralId expects a string parameter; type errors are only
      // reachable via validateCadastralId. This test confirms the boolean
      // result matches for string inputs.
      const validStrings = ["412010040110", "41201:004:0110", "78401:101:3143", "40302:001:0238"];
      const invalidStrings = ["", "12345", "1234567890", "41201004AB10", "412010040110!"];
      for (const s of validStrings) {
        expect(isValidCadastralId(s)).toBe(true);
      }
      for (const s of invalidStrings) {
        expect(isValidCadastralId(s)).toBe(false);
      }
    });
  });

  describe("CadastralId type", () => {
    test("CadastralId type is a string", () => {
      const id: string = "412010040110";
      const cadastralId: CadastralId = id;
      expect(cadastralId).toBe("412010040110");
    });
  });

  describe("CadastralIdErrorCode type", () => {
    test("includes INVALID_TYPE", () => {
      const code: CadastralIdErrorCode = "INVALID_TYPE";
      expect(code).toBe("INVALID_TYPE");
    });

    test("includes EMPTY", () => {
      const code: CadastralIdErrorCode = "EMPTY";
      expect(code).toBe("EMPTY");
    });

    test("includes INVALID_CHARACTERS", () => {
      const code: CadastralIdErrorCode = "INVALID_CHARACTERS";
      expect(code).toBe("INVALID_CHARACTERS");
    });

    test("includes WRONG_LENGTH", () => {
      const code: CadastralIdErrorCode = "WRONG_LENGTH";
      expect(code).toBe("WRONG_LENGTH");
    });
  });
});
