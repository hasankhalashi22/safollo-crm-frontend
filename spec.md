# Safollo CRM — System Specification

> **Stack:** React + Vite + TailwindCSS (Frontend, Vercel) · Node.js/Express + PostgreSQL (Backend, Render)  
> **Last updated:** 2026-08-04

---

## সিস্টেম ওভারভিউ

Safollo CRM একটি multi-module internal management system। একই platform-এ CRM, Accounting, HR, Academy এবং ESS (My Office) পরিচালনা করা যায়। প্রতিটি module আলাদা role ও permission দিয়ে নিয়ন্ত্রিত।

---

## Module ও Role সংক্ষেপ

| Module | URL Prefix | Roles |
|--------|-----------|-------|
| CRM | `/admin`, `/manager`, `/executive` | super_admin, advisor, manager, executive (roles table থেকে dynamic) |
| Accounting | `/accounting` | viewer, editor, admin |
| HR | `/hr` | viewer, HR Editor (hr_manager), HR Admin (hr_advisor) |
| Academy | `/academy` | viewer, editor, admin |
| My Office (ESS) | `/portal` | সব employee (has_ess = true) |
| Teacher Portal | `/teacher` | teacher (আলাদা auth) |

---

## 1. Authentication

**Routes:** `/api/auth`

| Action | বিবরণ |
|--------|-------|
| Login | Phone + PIN দিয়ে login; JWT token issue |
| Logout | Token invalidate |
| Get Me | নিজের profile, permissions, module_access লোড |
| Change PIN | নিজের PIN পরিবর্তন |
| Reset PIN | super_admin/advisor যেকোনো user-এর PIN reset করতে পারে |
| Force Change Password | প্রথম login-এ PIN change বাধ্যতামূলক |
| Complete Profile | নতুন user-এর profile setup |

---

## 2. CRM (Sales) Module

### 2.1 Sales (সেল এন্ট্রি)

**Routes:** `/api/sales`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| নতুন সেল এন্ট্রি | create_sale | Student phone, course, batch, payment info, payment proof আপলোড |
| সেল লিস্ট | view_sales | সব enrollment দেখা; executive শুধু নিজেরটা |
| সেল বিস্তারিত | view_sales | একটি enrollment-এর সব তথ্য + payment history |
| সেল এডিট | super_admin / advisor | enrollment তথ্য পরিবর্তন |
| সেল ডিলিট | যেকোনো (controller guard) | enrollment মুছে দেওয়া |
| বকেয়া লিস্ট | view_due | pending due payment-এর তালিকা |
| Due reassign | reassign_due | Due payment অন্য executive-এ ট্রান্সফার |

### 2.2 Sale Approval

**Routes:** `/api/approvals`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Pending সেল লিস্ট | level ≥ 3 (manager/admin) | Approve করার অপেক্ষায় থাকা সেল |
| Pending বকেয়া payment লিস্ট | level ≥ 3 | Approve করার অপেক্ষায় থাকা due payment |
| নিজের pending সেল | সবাই | Executive নিজের pending সেল দেখতে পারে |
| সেল Approve | level ≥ 3 | সেল অনুমোদন; approve সময় edit করা যায়: কোর্স মূল্য, সংগৃহীত টাকা, রেফারেন্স, নোট, **সেলের তারিখ**, **কোর্স পরিবর্তন** |
| সেল Reject | level ≥ 3 | সেল বাতিল; কারণ লেখা যায় |
| সেল Resubmit | executive | Reject হওয়া সেল পুনরায় submit |
| Due Payment Approve | level ≥ 3 | বকেয়া payment অনুমোদন |
| Due Payment Reject | level ≥ 3 | বকেয়া payment বাতিল |
| Due Payment Resubmit | executive | Reject হওয়া due payment পুনরায় submit |

### 2.3 Payments

**Routes:** `/api/payments`

| Action | বিবরণ |
|--------|-------|
| Payment যোগ | Payment proof ছবিসহ নতুন payment (due payment) |
| Payment amount update | Payment-এর পরিমাণ পরিবর্তন |
| Payment method update | Payment পদ্ধতি পরিবর্তন |
| Payment details update | Transaction ID, sender number ইত্যাদি |
| Payment বাতিল | নিজের payment cancel |
| Admin delete | Admin কর্তৃক যেকোনো payment মুছে দেওয়া |

### 2.4 কোর্স ও ব্যাচ ম্যানেজমেন্ট (CRM)

**Routes:** `/api/courses`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| কোর্স লিস্ট | সবাই | CRM-এ ব্যবহৃত course তালিকা |
| কোর্স তৈরি | super_admin / advisor | নতুন course |
| কোর্স এডিট | super_admin / advisor | Course তথ্য পরিবর্তন |
| কোর্স ডিলিট | super_admin / advisor | Course মুছে দেওয়া |
| ব্যাচ তৈরি | super_admin / advisor | Course-এর ব্যাচ তৈরি |
| ব্যাচ এডিট | super_admin / advisor | ব্যাচ তথ্য পরিবর্তন |
| ব্যাচ ডিলিট | super_admin / advisor | ব্যাচ মুছে দেওয়া |

### 2.5 রিপোর্ট

**Routes:** `/api/reports`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Daily Summary | সবাই | দৈনিক সেলের সংক্ষিপ্ত রিপোর্ট |
| Monthly Summary | সবাই | মাসিক সেলের রিপোর্ট |
| Admin Overview | level ≥ 3 | পুরো টিমের overview |
| My Performance | সবাই | নিজের performance রিপোর্ট |

### 2.6 Staff ও Role ম্যানেজমেন্ট

**Routes:** `/api/users`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Role লিস্ট | সবাই | সব role ও permission |
| Role তৈরি | super_admin / advisor | নতুন role (permissions কাস্টমাইজ করা যায়) |
| Role এডিট | super_admin / advisor | Role permission পরিবর্তন |
| Role ডিলিট | super_admin / advisor | Role মুছে দেওয়া |
| User লিস্ট | সবাই | সব CRM user |
| User তৈরি | super_admin / advisor | নতুন user; role assign |
| User এডিট | super_admin / advisor | User তথ্য ও role পরিবর্তন |
| User active/inactive | super_admin / advisor | User enable/disable |
| User ডিলিট | super_admin only | User মুছে দেওয়া |

### 2.7 Field Configuration

**Routes:** `/api/field-configs`

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Config দেখা | সবাই | Custom field settings |
| Config আপডেট | super_admin | Field visibility ও নাম পরিবর্তন |

### 2.8 Book Delivery (বই/উপকরণ)

**Routes:** `/api/book`

| Action | বিবরণ |
|--------|-------|
| Delivery নিশ্চিত | বই/উপকরণ বিতরণ confirm |
| Return mark | বই/উপকরণ ফেরত চিহ্নিত |

---

## 3. Accounting Module

**Routes:** `/api/accounting`  
**Access:** Accounting module access থাকলেই (viewer/editor/admin)

### 3.1 Dashboard
- আয়-ব্যয়ের সারসংক্ষেপ, account balance overview

### 3.2 Chart of Accounts

| Action | বিবরণ |
|--------|-------|
| Account লিস্ট | Filterable account তালিকা |
| সব Account | Full list (dropdown-এর জন্য) |
| Account তৈরি | নতুন account (asset/liability/income/expense/equity) |
| Account এডিট | Account তথ্য পরিবর্তন |
| Account ডিলিট | Account মুছে দেওয়া |
| Opening Balance | Account-এর opening balance সেট |
| Accrued Profit Override | বিনিয়োগকারীর জন্য accrued profit override |
| Account Balance | নির্দিষ্ট account-এর current balance |
| Ledger | Account-এর transaction history |

### 3.3 Transactions

| Action | বিবরণ |
|--------|-------|
| Transaction তৈরি | Journal entry; proof upload করা যায় |
| Transaction লিস্ট | Date range ও account filter |
| Transaction এডিট | পূর্ববর্তী transaction পরিবর্তন |
| Transaction ডিলিট | Transaction মুছে দেওয়া |
| Profit বিতরণ | Shareholders-এ profit distribution entry |

### 3.4 Financial Statements

| Statement | বিবরণ |
|-----------|-------|
| Journal | General Journal — সব entry chronologically |
| Ledger | নির্দিষ্ট account-এর সব transaction |
| Trial Balance | সব account-এর Dr/Cr balance |
| Income Statement | নির্দিষ্ট period-এ আয়-ব্যয় |
| Balance Sheet | Asset, Liability, Equity snapshot |
| Cash Flow Statement | Operating/Investing/Financing cash flow |
| Equity Statement | Equity পরিবর্তনের বিবরণ |

### 3.5 Reconciliation

- Bank/payment gateway statement upload করে system-এর সাথে মিলানো
- bKash ও Rocket settlement auto-import (cron)

### 3.6 Credit Cards
- Credit card-এর statement আপলোড, analyze, confirm করে accounting-এ entry

### 3.7 Investors (বিনিয়োগকারী)
- Investor তালিকা, accrual toggle, history

### 3.8 Shareholders (শেয়ারহোল্ডার)
- শেয়ারহোল্ডার তালিকা ও profit distribution history

---

## 4. HR Module

**Routes:** `/api/hr`, `/api/leave`, `/api/payroll`, `/api/attendance`  
**Access:** HR module access (viewer/hr_manager/hr_advisor)

### 4.1 Employee Directory

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Employee লিস্ট | viewer+ | সব employee |
| Employee বিস্তারিত | viewer+ | Profile, documents, module access |
| Employee তৈরি | HR Editor+ | নতুন employee |
| Employee এডিট | HR Editor+ | Employee তথ্য পরিবর্তন |
| Employee ডিলিট | super_admin | Employee মুছে দেওয়া |
| Photo upload | HR Editor+ | Profile photo |
| NID upload | HR Editor+ | NID document |
| Signature upload | HR Editor+ | Digital signature |
| CRM User link | HR Editor+ | CRM account-এর সাথে link |
| Module Access সেট | HR Admin | কোন module-এ কোন role দেওয়া হবে |
| ESS Login তৈরি | HR Editor+ | Employee-এর My Office login তৈরি |
| Profile Sync | সবাই | CRM profile → HR profile sync |

### 4.2 Organogram
- Employee hierarchy চার্ট; position ও reporting line অনুযায়ী

### 4.3 Positions
- Position/designation তৈরি, এডিট, ডিলিট

### 4.4 Leave Management

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Leave Type তৈরি/এডিট/ডিলিট | HR Admin | Annual Leave, Sick Leave ইত্যাদি |
| Leave Policy | HR Admin | Accrual rules, carry-forward |
| Holiday তৈরি/ডিলিট | HR Admin | সরকারি ও কোম্পানির ছুটি |
| Leave Apply (self) | ESS user | নিজে leave application |
| নিজের Applications | ESS user | নিজের leave history |
| নিজের Balances | ESS user | কতদিন leave বাকি |
| সব Applications | HR viewer+ | HR-এর কাছ থেকে সব application |
| Application Process | approver chain | Check → Consent → Approve/Reject |
| Leave Register | HR viewer+ | কে কতদিন ছুটি নিয়েছে |
| Approval Queue (self) | approver | নিজে যে applications approve করতে হবে |

### 4.5 Attendance

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Check-In | ESS user | সকালে উপস্থিতি দেওয়া |
| Break Out/In | ESS user | বিরতি শুরু/শেষ |
| Check-Out | ESS user | বিকালে বের হওয়া |
| Today Status | ESS user | আজকের attendance status |
| My History | ESS user | নিজের attendance history |
| My Monthly Summary | ESS user | মাসিক সারসংক্ষেপ |
| All Attendance | HR viewer+ | সবার attendance দেখা |
| Attendance Policy | HR Admin | Office time, grace period, rules |
| Break Types | HR Admin | Break-এর ধরন ও সময়সীমা |
| Waiver Request | ESS user | Late/absent এর জন্য waiver চাওয়া |
| Waiver Approve/Reject | HR Manager+ | Waiver সিদ্ধান্ত নেওয়া |
| Device Mappings | HR Admin | কোন device-এ কোন employee |
| Unmapped Punches | HR Admin | Device থেকে আসা unmatched punch |
| Device Registry | HR Admin | Attendance device register/এডিট |
| Punch History | HR Admin | Device থেকে recent punches |

### 4.6 Payroll

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Employee Components | HR viewer+ | Salary components (basic, allowance, deduction) |
| Component যোগ/বাদ | HR viewer+ | Component তৈরি/মুছে দেওয়া |
| Payroll Settings | HR Admin | সাধারণ payroll নিয়মকানুন |
| Month Prepare | HR viewer+ | মাসের payroll draft তৈরি |
| Draft আপডেট | HR viewer+ | Individual payroll পরিবর্তন |
| Recalculate | HR viewer+ | পুনরায় হিসাব করা |
| Finalize | HR viewer+ | নির্দিষ্ট employee-এর payroll চূড়ান্ত |
| Finalize All | HR viewer+ | সব draft একসাথে চূড়ান্ত |
| Payment record | HR viewer+ | Salary payment দেওয়া হয়েছে mark |
| Month Close | HR viewer+ | মাস বন্ধ করা |
| Payroll Runs লিস্ট | HR viewer+ | পূর্ববর্তী payroll history |

### 4.7 Notice Board

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Notice দেখা | সব logged-in user | Attachment সহ notice |
| Notice তৈরি | HR viewer+ | File attachment সহ notice publish |
| Notice ডিলিট | HR viewer+ | Notice মুছে দেওয়া |

---

## 5. Academy Module

**Routes:** `/api/academy`  
**Access:** Academy module access (viewer/editor/admin/super_admin)

### 5.1 Courses ও Plans

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| কোর্স লিস্ট | viewer+ | সব Academy course |
| কোর্স তৈরি | editor+ | নতুন course |
| কোর্স এডিট | editor+ | Course তথ্য পরিবর্তন |
| কোর্স ডিলিট | super_admin only | Course মুছে দেওয়া |
| Plan লিস্ট | viewer+ | Course-এর syllabus plan |
| Plan তৈরি | editor+ | নতুন plan |
| Plan এডিট | editor+ | Plan পরিবর্তন |
| Plan ডিলিট | super_admin only | Plan মুছে দেওয়া |
| Subject লিস্ট | viewer+ | Plan-এর subject তালিকা |
| Subject তৈরি | editor+ | নতুন subject |
| Subject import | editor+ | অন্য plan থেকে subject copy |
| Subject এডিট | editor+ | Subject পরিবর্তন |
| Subject ডিলিট | super_admin only | Subject মুছে দেওয়া |
| Lecture save | editor+ | Subject-এর lecture তথ্য সংরক্ষণ |
| Excel import | editor+ | Excel থেকে bulk plan/subject import |

### 5.2 Batches (রুটিন)

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Batch লিস্ট | viewer+ | সব batch/routine |
| Batch তৈরি | editor+ | নতুন batch |
| Batch এডিট | editor+ | Batch তথ্য পরিবর্তন |
| Batch ডিলিট | super_admin only | Batch মুছে দেওয়া |
| Outline দেখা | viewer+ | Batch-এর class schedule |
| Outline row যোগ | editor+ | নতুন class row |
| Bulk rows যোগ | editor+ | অনেক class একসাথে |
| Outline reorder | editor+ | Class order পরিবর্তন |
| Row এডিট | editor+ | Individual class তথ্য |
| Row ডিলিট | editor+ | Individual class মুছে দেওয়া |
| Bulk clear | super_admin only | পুরো schedule মুছে দেওয়া |
| Follow Batch | editor+ | অন্য batch-এর outline copy করা (cutoff সহ) |

### 5.3 Class Feedback

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Feedback submit | editor+ | Class শেষে feedback তৈরি |
| Pending feedbacks | viewer+ | Approve বাকি feedback লিস্ট |
| Feedback approve | editor+ | Feedback approve/reject; accounting entry trigger |

### 5.4 Teachers

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Teacher লিস্ট | viewer+ | সব teacher |
| Teacher বিস্তারিত | viewer+ | Profile ও history |
| Teacher তৈরি | editor+ | নতুন teacher |
| Teacher এডিট | editor+ | Teacher তথ্য পরিবর্তন |
| Teacher ডিলিট | admin+ | Teacher মুছে দেওয়া |

### 5.5 Teacher Payments

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Payment Summary | viewer+ | Teacher-ভিত্তিক পেমেন্ট overview |
| Payment Details | viewer+ | নির্দিষ্ট teacher-এর payment history |
| Payment লিস্ট | viewer+ | সব payment transaction |
| Pay Teacher | editor+ | Teacher-কে payment দেওয়া |
| Recalculate | editor+ | Payment পুনরায় হিসাব |
| Manual Transaction | editor+ | Custom payment entry |

### 5.6 Payment Rates

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Rate লিস্ট | viewer+ | Course type অনুযায়ী rate |
| Rate upsert | super_admin only | Rate তৈরি/আপডেট |
| Rate ডিলিট | super_admin only | নির্দিষ্ট rate মুছে দেওয়া |
| Course type rates ডিলিট | super_admin only | পুরো course type-এর rate মুছে দেওয়া |

### 5.7 Zoom Accounts

| Action | Permission | বিবরণ |
|--------|-----------|-------|
| Account লিস্ট | viewer+ | সব Zoom account |
| Account তৈরি | editor+ | নতুন Zoom account |
| Account এডিট | editor+ | Zoom account তথ্য পরিবর্তন |
| Account ডিলিট | admin+ | Zoom account মুছে দেওয়া |

### 5.8 Schedule Report
- Teacher-ভিত্তিক class schedule overview; date range filter

### 5.9 Settings (Academy)
- Teacher payment-এর accounting account সেটআপ (super_admin only)

---

## 6. My Office / ESS (Employee Self-Service)

**Routes:** `/portal`  
**Access:** `has_ess = true` সব employee

| পেজ | বিবরণ |
|-----|-------|
| Home / Dashboard | উপস্থিতি status, pending leave, notice |
| Attendance | Check-in/out, break management, history |
| Leave | Leave apply, balance দেখা, application history |
| Approvals | নিজে যে leave applications approve করতে হবে |
| Profile | নিজের profile দেখা ও আপডেট |

---

## 7. Teacher Portal

**Routes:** `/teacher`  
**Access:** Teacher-এর আলাদা JWT (teacher auth)

| পেজ | বিবরণ |
|-----|-------|
| Login | Teacher login |
| Register | Teacher registration |
| Profile Complete | Profile setup |
| Profile View | নিজের profile |
| Dashboard | Assigned courses ও subjects দেখা; feedback submit |

---

## 8. Cross-cutting Features

### 8.1 Notifications (Push)

| Feature | বিবরণ |
|---------|-------|
| VAPID Key | Web push-এর public key |
| Subscribe | Browser push notification subscribe |

### 8.2 Audit Log

| Feature | Permission | বিবরণ |
|---------|-----------|-------|
| Log দেখা | super_admin only | সব critical action-এর history |

### 8.3 Profiles

- Staff profile (CRM executive-এর details — name, photo ইত্যাদি)

---

## 9. Navigation ও UI Structure

### Top Module Bar
- সব user-এর জন্য উপরে module tab bar
- প্রতিটি module-এর নিজস্ব রঙ:

| Module | রঙ |
|--------|-----|
| CRM | #3b82f6 (Blue) |
| Accounting | #10b981 (Green) |
| HR | #f59e0b (Amber) |
| Academy | #8b5cf6 (Purple) |
| My Office | #ec4899 (Pink) |

- Background: `#1A7A6E` (brand primary)
- Active tab: module-এর solid color background
- Inactive tab: `#FEF9EE` cream রঙের text

### Sidebar
- Active module-এর sub-items শুধু দেখায়
- Module accordion নেই — switching top bar দিয়ে

---

## 10. Permission System

### CRM Roles (Dynamic — roles table)
- `super_admin` — সব কিছু
- `advisor` — role management, user management, sale edit
- `manager` — approval, team view (level 3)
- `executive` — নিজের sale entry, due list

### Module-based Access (`hr_employee_module_access`)
- Employee-কে যেকোনো module-এ role assign করা যায়
- `module_key`: `accounting`, `hr`, `academy`
- Role check: `authorizeModule(moduleKey, [roles])`

### Academy Roles
- `viewer` — শুধু দেখতে পারে
- `editor` — তৈরি/এডিট, feedback approve
- `admin` — editor + teacher/zoom delete
- `super_admin` — সব (delete course/batch/plan/subject, settings, payment rates)

### HR Roles
- `viewer` — শুধু দেখতে পারে
- `hr_manager` → **HR Editor** — settings ও module access ছাড়া সব
- `hr_advisor` → **HR Admin** — সব কিছু (module access সেট করা সহ)

---

## 11. Integrations

| Integration | বিবরণ |
|-------------|-------|
| Cloudinary | Payment proof, profile photo, NID, signature, notice attachment upload |
| bKash Settlement | Auto-import cron (accounting reconciliation) |
| Rocket Settlement | Auto-import cron (accounting reconciliation) |
| Web Push | Browser push notification (VAPID) |
| Biometric Device | Attendance punch device sync (unmapped punch management) |
