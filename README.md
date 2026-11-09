# Invoice Check (prototype)

Checks a supplier's GST invoice for common mistakes before a small business pays it. Fixed rules decide every verdict. Made-up sample invoices only.

**Two separate screens for two kinds of user (all files sit in one flat folder)**

| Screen | Address | Who uses it | What it does |
|---|---|---|---|
| Checker | `index.html` | Business owner or accounts person | Load or type an invoice, see problems, copy a note for the supplier. Shows which rulebook version was used. |
| Rules admin | `admin.html` | Compliance team | Rulebook, change requests, approvals, official-source list, activity log. |

A customer never sees the approval workflow. Approved changes in the admin screen are what the checker reads (in this demo, through the same browser's storage).

## Run it
No install and no build. Open `index.html`, or serve the folder: `npx serve .` or `python3 -m http.server`.

## Deploy
- **Vercel:** push this folder to a GitHub repo, then Vercel > Add New > Project > import the repo. Framework preset "Other", no build command, no config file needed.
- **Replit:** create an HTML/CSS/JS Repl, upload these files keeping the folders, then Deploy as a static site.
- **Netlify:** drag the folder onto app.netlify.com/drop.

## What is real and what is a demo
- Real: the rules engine (`checks.js`), the rulebook data model, approval rules (an admin approves, nobody approves their own change, rate changes need an official-domain source), effective dates, revoke, the audit log.
- Demo: the two roles are a dropdown, not sign-in. Requests and history live in the browser's storage, so the admin and checker only share data on the same browser. Nothing is sent to anyone, there are no notifications, and nothing is fetched from the internet.
- **`admin.html` is not protected.** On a public host anyone can open it. A real product needs sign-in, a database and an email or Slack notification to the approver. Nothing here should hold real data.

## Rule checks (14)
GSTIN format, state code, PAN letter and check character; CGST+SGST vs IGST; GST rate for the invoice date; special-rate Check; product reference rate; line arithmetic; CGST equals SGST; tax total; grand total; invoice number length and format; invoice date; HSN format.

## Tests
`node rules.test.js` runs the rules and approval logic in Node with no dependencies. `tests/synthetic-test-key.csv` lists the 20 invoices and the planted error in each. `tests/invoice-check-test-plan.md` and `tests/real-invoice-test-log.csv` are for testing on real invoices, which is the next step.

## Limits
No GSTIN registry lookup, no e-invoice (IRN) check, no cess or reverse charge, simplified place of supply, rule period follows invoice date not time of supply. The product reference has three codes marked as demo values. There is no live monitor of official sites; the Sources tab describes how one would draft requests for a person to approve.

Built with Claude. Product decisions and test design by Jiya Gidwani.
