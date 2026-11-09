# Invoice Check: test plan and how to talk about it

Prototype: a page where a small business pastes or photographs a supplier GST invoice and gets a verdict (hold payment / check / no problems found) with plain-language fixes. Built for the Pice application, since Pice serves GST-registered small businesses paying suppliers.

## What is real here
- Rule checks (not AI): GSTIN pattern and check character, state code, PAN type letter, invoice number format, date sanity, HSN format, GST rate slabs by invoice date (from 22 Sep 2025: 5% and 18%, 40% for a few goods, 12% removed, 28% kept only for some tobacco goods; source: PIB release on the 56th GST Council and Notification 9/2025-Central Tax (Rate)), qty × price, CGST = SGST, tax type for the two GSTIN states (IGST vs CGST+SGST), tax and total reconciliation.
- AI (Claude) only reads a photo into the form. The checks are then run by fixed rules, so a flag always has a stated reason.
- HSN to rate reference has only three codes (8517, 8471, 3004), is marked as a demo value in the rulebook, and only produces a "check" prompt. Do not claim rate coverage.
- Rules now live in a rulebook (Rulebook tab). Changes go through a request, an official source and a second approver. The roles and history in the prototype are a demo kept in the browser.

## Test 1: synthetic set (already run, sanity only)
20 made-up invoices: 4 clean, 16 with one planted error each. Result: all 16 planted errors flagged by the intended check (sample products were updated so none uses a product that is now nil-rated), and 0 false alarms on the 4 clean invoices. This only proves the rules do what they were written to do; the planted errors were written by us, so it is not evidence of real-world accuracy. File: synthetic-test-key.csv.

## Test 2: real invoices (this is what gives the resume line weight)
1. Ask 5 to 8 small business owners (family shops, friends' parents, local traders) for 2 to 3 real supplier invoices each. Cover or mask their GSTIN if they want; they can type a changed last digit to test a failing case only if they are comfortable.
2. For each invoice: photograph it, use Read from photo, and record in real-invoice-test-log.csv: did the photo read correctly, how many fields were wrong, did the tool flag anything, was the flag correct, would a person already have known.
3. Time how long checking takes by hand versus with the tool for 5 invoices.
4. Ask each tester one question: "Would you use this before paying a supplier?"

## Numbers to compute afterwards (only report what you measure)
- Photo read accuracy: fields read correctly / total fields, across all real invoices.
- Flag precision: correct flags / all flags. A wrong flag counts against you; report it honestly.
- Real issues found: flags that were genuine and not already known.
- Time per invoice: by hand vs tool (median).

## Resume bullet shapes (fill with your real numbers)
- Built and tested an AI-assisted invoice checker for GST-registered small businesses: photo-to-fields extraction plus rule-based validation of GSTIN, tax type, rates and totals; tested on [N] real supplier invoices from [M] businesses.
- Flagged [X] genuine errors, [P]% of flags correct, extraction accuracy [A]%; identified [Y] failure patterns (for example, handwritten invoices, multi-rate lines) and scoped fixes.
- Designed to be rules-first with AI only for reading, so every flag can be explained to a supplier.

## What to say in the interview
- Why this: Pice's users pay suppliers on credit; a wrong invoice becomes a wrong payment or lost input credit.
- What I'd build next: supplier-side e-invoice (IRN) check, GSTIN status lookup via an official API, duplicate invoice detection, and a "pay now or use credit" step.
- What I'm unsure about: place of supply edge cases, cess, composition-scheme suppliers, and rate accuracy beyond the demo reference.
