#!/usr/bin/env python3
"""
Remediate hardcoded mock strings and SuiteIvy fallbacks in backend controllers
"""

def main():
    # 1. clearance.controller.js
    with open('backend/controllers/clearance.controller.js', 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('"SuiteIvy Institution"', 'institution?.name || "Academic Institution"')
    with open('backend/controllers/clearance.controller.js', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(c)

    # 2. finance.controller.js
    with open('backend/controllers/finance.controller.js', 'r', encoding='utf-8') as f:
        fc = f.read()

    fc = fc.replace("'SuiteIvy Institution'", "institution?.name || 'Academic Institution'")
    fc = fc.replace("'P.O. Box Nairobi, Kenya'", "institution?.address || null")
    fc = fc.replace("'bursar@suiteivy.edu'", "institution?.contact_email || null")
    fc = fc.replace("'+254 700 000 000'", "institution?.phone || null")
    fc = fc.replace("'Standard Chartered Bank'", "bankDetails?.bank_name || null")
    fc = fc.replace("'010203040506'", "bankDetails?.account_number || null")
    fc = fc.replace("'SuiteIvy Academy'", "institution?.name || null")
    fc = fc.replace("'247247'", "bankDetails?.paybill_number || null")

    with open('backend/controllers/finance.controller.js', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(fc)

    print("Successfully remediated hardcoded SuiteIvy fallback strings.")

if __name__ == '__main__':
    main()
