// 20 made-up sample invoices: 4 clean and 16 with one planted error each. The answer key is in tests/synthetic-test-key.csv.
const SAMPLES = [
 {
  "id": 1,
  "note": "clean intra-state",
  "expect": [],
  "inv": {
   "invoiceNo": "KMA/2627/0412",
   "date": "2026-09-30",
   "supplierName": "Kaveri Mobile Accessories",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29AABFK4821M1Z3",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Mobile handset 4G",
     "hsn": "85171300",
     "qty": 3,
     "rate": 8490,
     "taxable": 25470,
     "gstRate": 18
    },
    {
     "desc": "Tempered glass pack",
     "hsn": "39269099",
     "qty": 40,
     "rate": 60,
     "taxable": 2400,
     "gstRate": 18
    }
   ],
   "cgst": 2508.3,
   "sgst": 2508.3,
   "igst": 0,
   "total": 32886.6
  }
 },
 {
  "id": 2,
  "note": "clean intra-state",
  "expect": [],
  "inv": {
   "invoiceNo": "AS-1187",
   "date": "2026-10-12",
   "supplierName": "Anand Stationers",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29BRTPA3310C1Z5",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Whiteboard markers (box of 10)",
     "hsn": "96082000",
     "qty": 25,
     "rate": 310,
     "taxable": 7750,
     "gstRate": 18
    },
    {
     "desc": "Gel pens (box)",
     "hsn": "96081099",
     "qty": 30,
     "rate": 120,
     "taxable": 3600,
     "gstRate": 18
    }
   ],
   "cgst": 1021.5,
   "sgst": 1021.5,
   "igst": 0,
   "total": 13393
  }
 },
 {
  "id": 3,
  "note": "clean inter-state",
  "expect": [],
  "inv": {
   "invoiceNo": "LE/10/2290",
   "date": "2026-10-12",
   "supplierName": "Lakshmi Electronics",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "33AAECL7712Q1Z4",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Laptop 15 inch",
     "hsn": "84713010",
     "qty": 2,
     "rate": 41500,
     "taxable": 83000,
     "gstRate": 18
    },
    {
     "desc": "Wireless mouse",
     "hsn": "84716060",
     "qty": 10,
     "rate": 450,
     "taxable": 4500,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 15750,
   "total": 103250
  }
 },
 {
  "id": 4,
  "note": "clean intra-state",
  "expect": [],
  "inv": {
   "invoiceNo": "SPD2610-77",
   "date": "2026-10-21",
   "supplierName": "Sunrise Pharma Distributors",
   "buyerName": "Mehta Grocers & Co",
   "supplierGstin": "27AAGCS5509H1Z8",
   "buyerGstin": "27AFHPM6402E1ZO",
   "items": [
    {
     "desc": "Paracetamol 500mg strips",
     "hsn": "30049099",
     "qty": 200,
     "rate": 22,
     "taxable": 4400,
     "gstRate": 5
    },
    {
     "desc": "Vitamin C tablets",
     "hsn": "30045039",
     "qty": 120,
     "rate": 48,
     "taxable": 5760,
     "gstRate": 5
    }
   ],
   "cgst": 254,
   "sgst": 254,
   "igst": 0,
   "total": 10668
  }
 },
 {
  "id": 5,
  "note": "supplier GSTIN last character altered",
  "expect": [
   "gstin_supplier"
  ],
  "inv": {
   "invoiceNo": "DOS/26/0931",
   "date": "2026-10-12",
   "supplierName": "Deccan Office Supplies",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "36CPLFD1180B1Z7",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Office chair",
     "hsn": "94013000",
     "qty": 6,
     "rate": 3200,
     "taxable": 19200,
     "gstRate": 18
    },
    {
     "desc": "Steel file cabinet",
     "hsn": "94031010",
     "qty": 2,
     "rate": 6800,
     "taxable": 13600,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 5904,
   "total": 38704
  }
 },
 {
  "id": 6,
  "note": "buyer GSTIN last character altered",
  "expect": [
   "gstin_buyer"
  ],
  "inv": {
   "invoiceNo": "KMA/2627/0430",
   "date": "2026-10-12",
   "supplierName": "Kaveri Mobile Accessories",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29AABFK4821M1Z3",
   "buyerGstin": "29ABCPG9921K1Z3",
   "items": [
    {
     "desc": "Mobile handset 4G",
     "hsn": "85171300",
     "qty": 2,
     "rate": 8490,
     "taxable": 16980,
     "gstRate": 18
    }
   ],
   "cgst": 1528.2,
   "sgst": 1528.2,
   "igst": 0,
   "total": 20036.4
  }
 },
 {
  "id": 7,
  "note": "buyer state code 50 does not exist (checksum valid)",
  "expect": [
   "gstin_buyer"
  ],
  "inv": {
   "invoiceNo": "LE/10/2301",
   "date": "2026-10-12",
   "supplierName": "Lakshmi Electronics",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "33AAECL7712Q1Z4",
   "buyerGstin": "50ABCPG9921K1ZR",
   "items": [
    {
     "desc": "Laptop 15 inch",
     "hsn": "84713010",
     "qty": 1,
     "rate": 41500,
     "taxable": 41500,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 7470,
   "total": 48970
  }
 },
 {
  "id": 8,
  "note": "intra-state billed with IGST",
  "expect": [
   "tax_split"
  ],
  "inv": {
   "invoiceNo": "AS-1190",
   "date": "2026-10-12",
   "supplierName": "Anand Stationers",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29BRTPA3310C1Z5",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Whiteboard markers (box of 10)",
     "hsn": "96082000",
     "qty": 20,
     "rate": 310,
     "taxable": 6200,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 1116,
   "total": 7316
  }
 },
 {
  "id": 9,
  "note": "inter-state billed with CGST+SGST",
  "expect": [
   "tax_split"
  ],
  "inv": {
   "invoiceNo": "LE/10/2315",
   "date": "2026-10-12",
   "supplierName": "Lakshmi Electronics",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "33AAECL7712Q1Z4",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Laptop 15 inch",
     "hsn": "84713010",
     "qty": 1,
     "rate": 41500,
     "taxable": 41500,
     "gstRate": 18
    }
   ],
   "cgst": 3735,
   "sgst": 3735,
   "igst": 0,
   "total": 48970
  }
 },
 {
  "id": 10,
  "note": "CGST and SGST unequal, total tax unchanged",
  "expect": [
   "cgst_sgst"
  ],
  "inv": {
   "invoiceNo": "AS-1196",
   "date": "2026-10-12",
   "supplierName": "Anand Stationers",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29BRTPA3310C1Z5",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Whiteboard markers (box of 10)",
     "hsn": "96082000",
     "qty": 20,
     "rate": 310,
     "taxable": 6200,
     "gstRate": 18
    }
   ],
   "cgst": 600,
   "sgst": 516,
   "igst": 0,
   "total": 7316
  }
 },
 {
  "id": 11,
  "note": "line value inflated: 40 × 60 shown as 3,000",
  "expect": [
   "line_math"
  ],
  "inv": {
   "invoiceNo": "KMA/2627/0444",
   "date": "2026-10-21",
   "supplierName": "Kaveri Mobile Accessories",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29AABFK4821M1Z3",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Mobile handset 4G",
     "hsn": "85171300",
     "qty": 3,
     "rate": 8490,
     "taxable": 25470,
     "gstRate": 18
    },
    {
     "desc": "Tempered glass pack",
     "hsn": "39269099",
     "qty": 40,
     "rate": 60,
     "taxable": 3000,
     "gstRate": 18
    }
   ],
   "cgst": 2562.3,
   "sgst": 2562.3,
   "igst": 0,
   "total": 33594.6
  }
 },
 {
  "id": 12,
  "note": "tax billed ₹800 lower than rate × value",
  "expect": [
   "tax_total"
  ],
  "inv": {
   "invoiceNo": "AS-1201",
   "date": "2026-10-21",
   "supplierName": "Anand Stationers",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29BRTPA3310C1Z5",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Whiteboard markers (box of 10)",
     "hsn": "96082000",
     "qty": 25,
     "rate": 310,
     "taxable": 7750,
     "gstRate": 18
    },
    {
     "desc": "Gel pens (box)",
     "hsn": "96081099",
     "qty": 30,
     "rate": 120,
     "taxable": 3600,
     "gstRate": 18
    }
   ],
   "cgst": 621.5,
   "sgst": 621.5,
   "igst": 0,
   "total": 12593
  }
 },
 {
  "id": 13,
  "note": "grand total overstated by ₹850",
  "expect": [
   "grand_total"
  ],
  "inv": {
   "invoiceNo": "SPD2610-81",
   "date": "2026-10-21",
   "supplierName": "Sunrise Pharma Distributors",
   "buyerName": "Mehta Grocers & Co",
   "supplierGstin": "27AAGCS5509H1Z8",
   "buyerGstin": "27AFHPM6402E1ZO",
   "items": [
    {
     "desc": "Paracetamol 500mg strips",
     "hsn": "30049099",
     "qty": 200,
     "rate": 22,
     "taxable": 4400,
     "gstRate": 5
    }
   ],
   "cgst": 110,
   "sgst": 110,
   "igst": 0,
   "total": 5470
  }
 },
 {
  "id": 14,
  "note": "12% rate on an invoice after 22 Sep 2025",
  "expect": [
   "rate_slab"
  ],
  "inv": {
   "invoiceNo": "DOS/26/0950",
   "date": "2026-10-21",
   "supplierName": "Deccan Office Supplies",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "36CPLFD1180B1ZX",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Office chair",
     "hsn": "94013000",
     "qty": 4,
     "rate": 3200,
     "taxable": 12800,
     "gstRate": 12
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 1536,
   "total": 14336
  }
 },
 {
  "id": 15,
  "note": "14% is not a slab",
  "expect": [
   "rate_slab"
  ],
  "inv": {
   "invoiceNo": "DOS/26/0951",
   "date": "2026-10-21",
   "supplierName": "Deccan Office Supplies",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "36CPLFD1180B1ZX",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Steel file cabinet",
     "hsn": "94031010",
     "qty": 2,
     "rate": 6800,
     "taxable": 13600,
     "gstRate": 14
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 1904,
   "total": 15504
  }
 },
 {
  "id": 16,
  "note": "HSN 8517 at 5% (usual 18%)",
  "expect": [
   "rate_ref"
  ],
  "inv": {
   "invoiceNo": "KMA/2627/0460",
   "date": "2026-10-21",
   "supplierName": "Kaveri Mobile Accessories",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29AABFK4821M1Z3",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Mobile handset 4G",
     "hsn": "85171300",
     "qty": 2,
     "rate": 8490,
     "taxable": 16980,
     "gstRate": 5
    }
   ],
   "cgst": 424.5,
   "sgst": 424.5,
   "igst": 0,
   "total": 17829
  }
 },
 {
  "id": 17,
  "note": "date in the future",
  "expect": [
   "inv_date"
  ],
  "inv": {
   "invoiceNo": "LE/10/2340",
   "date": "2027-03-05",
   "supplierName": "Lakshmi Electronics",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "33AAECL7712Q1Z4",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Laptop 15 inch",
     "hsn": "84713010",
     "qty": 1,
     "rate": 41500,
     "taxable": 41500,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 7470,
   "total": 48970
  }
 },
 {
  "id": 18,
  "note": "invoice number 31 characters long",
  "expect": [
   "inv_no"
  ],
  "inv": {
   "invoiceNo": "LE/10/2341/FY2026-27/BLR/00091",
   "date": "2026-10-21",
   "supplierName": "Lakshmi Electronics",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "33AAECL7712Q1Z4",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Laptop 15 inch",
     "hsn": "84713010",
     "qty": 1,
     "rate": 41500,
     "taxable": 41500,
     "gstRate": 18
    }
   ],
   "cgst": 0,
   "sgst": 0,
   "igst": 7470,
   "total": 48970
  }
 },
 {
  "id": 19,
  "note": "HSN has 5 digits",
  "expect": [
   "hsn_format"
  ],
  "inv": {
   "invoiceNo": "AS-1215",
   "date": "2026-10-21",
   "supplierName": "Anand Stationers",
   "buyerName": "Greenleaf General Store",
   "supplierGstin": "29BRTPA3310C1Z5",
   "buyerGstin": "29ABCPG9921K1ZC",
   "items": [
    {
     "desc": "Whiteboard markers (box of 10)",
     "hsn": "96082",
     "qty": 20,
     "rate": 310,
     "taxable": 6200,
     "gstRate": 18
    }
   ],
   "cgst": 558,
   "sgst": 558,
   "igst": 0,
   "total": 7316
  }
 },
 {
  "id": 20,
  "note": "buyer GSTIN missing (warning)",
  "expect": [
   "gstin_buyer"
  ],
  "inv": {
   "invoiceNo": "SPD2610-90",
   "date": "2026-10-21",
   "supplierName": "Sunrise Pharma Distributors",
   "buyerName": "Mehta Grocers & Co",
   "supplierGstin": "27AAGCS5509H1Z8",
   "buyerGstin": "",
   "items": [
    {
     "desc": "Vitamin C tablets",
     "hsn": "30045039",
     "qty": 100,
     "rate": 48,
     "taxable": 4800,
     "gstRate": 5
    }
   ],
   "cgst": 120,
   "sgst": 120,
   "igst": 0,
   "total": 5040
  }
 }
];
