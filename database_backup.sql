--
-- PostgreSQL database dump
--

\restrict gvLpbyNVAXqiCrfouRkYc48k0WkLoHh3HmYAp5iHyflodA4DlaytpUe7HUTWdaV

-- Dumped from database version 16.10 (0374078)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.app_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    approvals_required_for_allowance integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    daily_allowances text
);


ALTER TABLE public.app_settings OWNER TO neondb_owner;

--
-- Name: attendances; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.attendances (
    id character varying(36) DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(36) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    attendance_data text NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attendances OWNER TO neondb_owner;

--
-- Name: daily_allowances; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.daily_allowances (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying NOT NULL,
    date date NOT NULL,
    allowance_data text NOT NULL,
    submitted_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    approval_status character varying DEFAULT 'pending'::character varying,
    approved_by character varying,
    approved_at timestamp without time zone,
    team_id character varying(255),
    paid_status character varying(50) DEFAULT 'unpaid'::character varying NOT NULL,
    rejection_reason character varying,
    approval_count integer DEFAULT 0,
    selected_employee_ids text
);


ALTER TABLE public.daily_allowances OWNER TO neondb_owner;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.departments (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO neondb_owner;

--
-- Name: designations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.designations (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.designations OWNER TO neondb_owner;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.employees (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    dob date,
    father_name text NOT NULL,
    mobile character varying NOT NULL,
    alternate_no character varying,
    address text NOT NULL,
    city character varying NOT NULL,
    state character varying NOT NULL,
    country character varying DEFAULT 'India'::character varying NOT NULL,
    doj date NOT NULL,
    aadhar character varying,
    pan character varying,
    blood_group character varying NOT NULL,
    marital_status character varying NOT NULL,
    nominee text NOT NULL,
    ppe_kit boolean DEFAULT false NOT NULL,
    kit_no character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    status character varying DEFAULT 'Active'::character varying NOT NULL,
    email character varying DEFAULT 'unset'::character varying NOT NULL,
    password text,
    department_id character varying,
    designation_id character varying,
    role character varying DEFAULT 'user'::character varying
);


ALTER TABLE public.employees OWNER TO neondb_owner;

--
-- Name: export_headers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.export_headers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_name text,
    report_title text,
    footer_text text,
    show_generated_date boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    contact_phone character varying,
    contact_email character varying,
    website character varying,
    gstin character varying,
    address text,
    state character varying,
    city character varying
);


ALTER TABLE public.export_headers OWNER TO neondb_owner;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_number character varying NOT NULL,
    vendor_id character varying NOT NULL,
    po_id character varying NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric NOT NULL,
    gst numeric DEFAULT 0 NOT NULL,
    total_amount numeric NOT NULL,
    status character varying DEFAULT 'Draft'::character varying NOT NULL,
    payment_method character varying,
    payment_date date,
    bank_details text,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: payment_masters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_masters (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    antenna_size character varying NOT NULL,
    site_amount numeric NOT NULL,
    vendor_amount numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    site_id character varying NOT NULL,
    vendor_id character varying NOT NULL,
    plan_id character varying NOT NULL
);


ALTER TABLE public.payment_masters OWNER TO neondb_owner;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    po_number character varying NOT NULL,
    vendor_id character varying NOT NULL,
    site_id character varying NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    po_date date NOT NULL,
    due_date date NOT NULL,
    status character varying DEFAULT 'Draft'::character varying NOT NULL,
    approved_by character varying,
    approval_date date,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    gst_type character varying DEFAULT 'cgstsgst'::character varying,
    igst_percentage numeric DEFAULT '0'::numeric,
    igst_amount numeric DEFAULT '0'::numeric,
    cgst_percentage numeric DEFAULT '0'::numeric,
    cgst_amount numeric DEFAULT '0'::numeric,
    sgst_percentage numeric DEFAULT '0'::numeric,
    sgst_amount numeric DEFAULT '0'::numeric,
    gst_apply boolean DEFAULT true
);


ALTER TABLE public.purchase_orders OWNER TO neondb_owner;

--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.salary_structures (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying NOT NULL,
    basic_salary numeric NOT NULL,
    hra numeric NOT NULL,
    da numeric NOT NULL,
    lta numeric NOT NULL,
    conveyance numeric NOT NULL,
    medical numeric NOT NULL,
    bonuses numeric DEFAULT 0 NOT NULL,
    other_benefits numeric DEFAULT 0 NOT NULL,
    pf numeric NOT NULL,
    professional_tax numeric NOT NULL,
    income_tax numeric DEFAULT 0 NOT NULL,
    epf numeric NOT NULL,
    esic numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    want_deduction boolean DEFAULT true NOT NULL
);


ALTER TABLE public.salary_structures OWNER TO neondb_owner;

--
-- Name: sites; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sites (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    site_id character varying NOT NULL,
    vendor_id character varying NOT NULL,
    plan_id character varying NOT NULL,
    site_amount numeric,
    vendor_amount numeric,
    status character varying DEFAULT 'Pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    s_no integer,
    circle character varying,
    nominal_aop character varying,
    hop_type character varying,
    hop_a_b character varying,
    hop_b_a character varying,
    district character varying,
    project character varying,
    site_a_ant_dia character varying,
    site_b_ant_dia character varying,
    max_ant_size character varying,
    site_a_name character varying,
    toco_vendor_a character varying,
    toco_id_a character varying,
    site_b_name character varying,
    toco_vendor_b character varying,
    toco_id_b character varying,
    media_availability_status character varying,
    sr_no_site_a character varying,
    sr_date_site_a date,
    sr_no_site_b character varying,
    sr_date_site_b date,
    hop_sr_date date,
    sp_date_site_a date,
    sp_date_site_b date,
    hop_sp_date date,
    so_released_date_site_a date,
    so_released_date_site_b date,
    hop_so_date date,
    rfai_offered_date_site_a date,
    rfai_offered_date_site_b date,
    actual_hop_rfai_offered_date date,
    partner_name character varying,
    rfai_survey_completion_date date,
    mo_number_site_a character varying,
    material_type_site_a character varying,
    mo_date_site_a date,
    mo_number_site_b character varying,
    material_type_site_b character varying,
    mo_date_site_b date,
    srn_rmo_number character varying,
    srn_rmo_date date,
    hop_mo_date date,
    hop_material_dispatch_date date,
    hop_material_delivery_date date,
    material_delivery_status character varying,
    site_a_installation_date date,
    ptw_number_site_a character varying,
    ptw_status_a character varying,
    site_b_installation_date date,
    ptw_number_site_b character varying,
    ptw_status_b character varying,
    hop_ic_date date,
    alignment_date date,
    hop_installation_remarks text,
    visible_in_nms character varying,
    nms_visible_date date,
    soft_at_offer_date date,
    soft_at_acceptance_date date,
    soft_at_status character varying,
    phy_at_offer_date date,
    phy_at_acceptance_date date,
    phy_at_status character varying,
    both_at_status character varying,
    pri_issue_category character varying,
    pri_site_id character varying,
    pri_open_date date,
    pri_close_date date,
    pri_history text,
    rfi_survey_allocation_date date,
    descope character varying,
    reason_of_extra_visit text,
    wcc_received_80_percent character varying,
    wcc_received_date_80_percent date,
    wcc_received_20_percent character varying,
    wcc_received_date_20_percent date,
    wcc_received_date_100_percent date,
    survey character varying,
    final_partner_survey character varying,
    survey_date date,
    zone_id character varying
);


ALTER TABLE public.sites OWNER TO neondb_owner;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_members (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    team_id character varying NOT NULL,
    employee_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    reporting_person_1 character varying,
    reporting_person_2 character varying,
    reporting_person_3 character varying
);


ALTER TABLE public.team_members OWNER TO neondb_owner;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.teams (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO neondb_owner;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendors (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email character varying NOT NULL,
    mobile character varying NOT NULL,
    address text NOT NULL,
    city character varying NOT NULL,
    state character varying NOT NULL,
    pincode character varying NOT NULL,
    country character varying DEFAULT 'India'::character varying NOT NULL,
    aadhar character varying NOT NULL,
    pan character varying NOT NULL,
    gstin character varying,
    moa text,
    category character varying DEFAULT 'Individual'::character varying NOT NULL,
    status character varying DEFAULT 'Pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password character varying,
    role character varying DEFAULT 'Vendor'::character varying NOT NULL,
    vendor_code character varying(255)
);


ALTER TABLE public.vendors OWNER TO neondb_owner;

--
-- Name: zones; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.zones (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_name character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.zones OWNER TO neondb_owner;

--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.app_settings (id, approvals_required_for_allowance, created_at, updated_at, daily_allowances) FROM stdin;
bd88301a-52e0-4a19-be7a-6b2039e76f2a	2	2025-11-29 20:36:11.428816	2025-11-29 20:36:11.428816	\N
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.attendances (id, employee_id, month, year, attendance_data, submitted_at, created_at, updated_at) FROM stdin;
79e2bac4-f132-4400-a777-583f17f4b607	e61583d1-b735-4359-b5f3-545003ac0403	11	2025	{"29":"present"}	2025-11-29 13:59:03.375728	2025-11-29 13:59:03.375728	2025-11-29 13:59:03.375728
\.


--
-- Data for Name: daily_allowances; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.daily_allowances (id, employee_id, date, allowance_data, submitted_at, created_at, updated_at, approval_status, approved_by, approved_at, team_id, paid_status, rejection_reason, approval_count, selected_employee_ids) FROM stdin;
4ce2489a-e54b-4437-a804-1e1f3ff535b3	e61583d1-b735-4359-b5f3-545003ac0403	2025-11-29	{"travelAllowance":100,"foodAllowance":0,"accommodationAllowance":100,"mobileAllowance":0,"internetAllowance":0,"utilitiesAllowance":100,"parkingAllowance":0,"miscAllowance":100,"notes":""}	2025-11-29 21:36:37.239164	2025-11-29 21:36:37.239164	2025-11-29 21:36:37.239164	approved	["admin"]	2025-11-30 13:52:04.825	8d842575-1607-41f4-ba69-1b4d2bcea583	unpaid	\N	2	\N
c89bc890-4259-4f30-91e1-f93175516ba5	18132d05-6c18-4d96-aeba-dee2c633e44a	2025-12-02	{"travelAllowance":1000,"foodAllowance":0,"accommodationAllowance":0,"mobileAllowance":0,"internetAllowance":0,"utilitiesAllowance":0,"parkingAllowance":0,"miscAllowance":0,"notes":""}	2025-12-02 21:24:29.896635	2025-12-02 21:24:29.896635	2025-12-02 21:24:29.896635	processing	["admin"]	2025-12-03 14:16:48.913	8d842575-1607-41f4-ba69-1b4d2bcea583	unpaid	\N	1	\N
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.departments (id, name, created_at, updated_at) FROM stdin;
87836024-ae0c-43e8-b481-54ac6f4ede4f	Engineering	2025-11-28 20:22:34.012201	2025-11-28 20:22:34.012201
b6e60192-c8af-4ab9-b81c-512a70ca3a53	Operations	2025-11-28 20:22:34.012201	2025-11-28 20:22:34.012201
bd38bc03-5af3-45ff-bab7-019b9d29c150	HR	2025-11-28 20:22:34.012201	2025-11-28 20:22:34.012201
7b6469f8-71e8-4658-a89e-29bc6fcd2680	Finance	2025-11-28 20:22:34.012201	2025-11-28 20:22:34.012201
f21b7c25-1f3f-40e7-aeec-de22e6fa3895	Sales	2025-11-28 20:22:34.012201	2025-11-28 20:22:34.012201
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.designations (id, name, created_at, updated_at) FROM stdin;
9a2f8d0b-4ffb-4183-8789-7d567e0c8065	Senior Engineer	2025-11-28 20:22:34.082175	2025-11-28 20:22:34.082175
ca621540-e585-4858-9537-3f38a34f9881	Junior Engineer	2025-11-28 20:22:34.082175	2025-11-28 20:22:34.082175
6b9eb7b0-d253-4cb7-bdb3-8faf3e34e6a8	Manager	2025-11-28 20:22:34.082175	2025-11-28 20:22:34.082175
58dc1a4c-273d-459e-bf61-430dd99a8c6d	Coordinator	2025-11-28 20:22:34.082175	2025-11-28 20:22:34.082175
31fd05dc-f74f-442a-8ac2-293cb775c9df	Executive	2025-11-28 20:22:34.082175	2025-11-28 20:22:34.082175
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employees (id, name, dob, father_name, mobile, alternate_no, address, city, state, country, doj, aadhar, pan, blood_group, marital_status, nominee, ppe_kit, kit_no, created_at, updated_at, status, email, password, department_id, designation_id, role) FROM stdin;
18132d05-6c18-4d96-aeba-dee2c633e44a	Aryan	\N	AJHGAJG	8888888888		kjhjghj			India	2025-01-01				Single	Not Specified	f		2025-11-29 06:23:13.45659	2025-11-29 06:23:13.45659	Active	aryan@gmail.com	$2b$10$m/dWzxTDEH.oXpnqxWL60O7ichX2Yi1BWLjvvbA3bHZVXaUzMyu8K	b6e60192-c8af-4ab9-b81c-512a70ca3a53	6b9eb7b0-d253-4cb7-bdb3-8faf3e34e6a8	user
e61583d1-b735-4359-b5f3-545003ac0403	Ramesh	\N	HHHH	7777777777		jhjhgjhj			India	2025-11-20				Single	Not Specified	t	876786767678	2025-11-29 08:14:16.715081	2025-11-29 08:14:16.715081	Active	ramesh@gmail.com	$2b$10$mBmVYHwRhghwlH2l37GWruN4GHWYLWz1lViNw61t3teUnHz7Ooz8G	bd38bc03-5af3-45ff-bab7-019b9d29c150	58dc1a4c-273d-459e-bf61-430dd99a8c6d	user
2278fbcb-5dd4-4608-9fa7-f2410f86dd7a	System Administrator	\N	System	9999999999	9999999998	System Location	Not Specified	Not Specified	India	2025-01-01			O+	Single	System	f		2025-11-29 07:23:46.066921	2025-11-29 07:23:46.066921	Active	superadmin@ems.local	$2b$10$pQmz0XnOeYHG1uJv68zDrO73cUjj9hIO7hzzD/AgKh34wGD6s1alq	\N	\N	superadmin
ffa78016-7969-44b7-bbad-5ff3981d3cde	Mohit Gupta	\N	ADFGH	9878987898		ASDDGGGG			India	2025-01-01				Single	Not Specified	f		2025-11-29 06:13:07.737313	2025-11-29 06:13:07.737313	Active	ermohit1189@gmail.com	$2b$10$M0/dLV.yAkm09MXfOm9.q.efi4G/s0f6QbcKVLv3SCfHTPd8u1UEi	87836024-ae0c-43e8-b481-54ac6f4ede4f	9a2f8d0b-4ffb-4183-8789-7d567e0c8065	admin
\.


--
-- Data for Name: export_headers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.export_headers (id, company_name, report_title, footer_text, show_generated_date, created_at, updated_at, contact_phone, contact_email, website, gstin, address, state, city) FROM stdin;
2539609c-5eaf-42c9-9e15-a2d6aaf155ea	JIYA INFOTECH PVT LTD	A NETWORK BASED COMPANY	This document contains confidential and proprietary information. Unauthorized distribution or reproduction is strictly prohibited. For inquiries, contact your system administrator.	t	2025-11-28 15:38:25.718983	2025-11-28 15:38:25.718983	7898767890	info@jiyatechnology.in	https://www.jiyainfotech.in	27AABCT1234H1Z0	Vastu Khannd, Gomti Nagar, Lucknow	Uttar Pradesh	Lucknow
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, invoice_number, vendor_id, po_id, invoice_date, due_date, amount, gst, total_amount, status, payment_method, payment_date, bank_details, remarks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_masters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_masters (id, antenna_size, site_amount, vendor_amount, created_at, updated_at, site_id, vendor_id, plan_id) FROM stdin;
30ad3fdb-9b14-492c-8f64-ac9a5bf4069f	0.6	1000	800	2025-11-28 13:11:12.621081	2025-11-28 13:11:12.621081	bd1e4c70-75b0-4369-82c0-84ec844f952d	d5255088-295e-4382-b418-9d7035d950fc	456789098765ff456hnn
a3b72628-223f-40c1-8eb7-836c09b2b451	0.9	1200	1000	2025-11-28 13:11:26.951312	2025-11-28 13:11:26.951312	bd1e4c70-75b0-4369-82c0-84ec844f952d	d5255088-295e-4382-b418-9d7035d950fc	456789098765ff456hnn
7b520b95-8ea6-414a-8ffe-a00287b9fd9d	1.2	1400	1200	2025-11-28 13:11:34.463551	2025-11-28 13:11:34.463551	bd1e4c70-75b0-4369-82c0-84ec844f952d	d5255088-295e-4382-b418-9d7035d950fc	456789098765ff456hnn
ae1194f9-1119-4b47-b014-6a4cee7a80fa	0.6	1000	800	2025-11-28 13:11:45.254269	2025-11-28 13:11:45.254269	6daa1dd6-9bde-4a99-935c-145e4544e464	3987f57e-5118-4e3e-88a5-13f4406a5d26	1234756712457324jghjrgrhjew8643783624hjgwhewj
43fc7333-32c4-4006-b034-1ca5922b034c	1.2	1400	1200	2025-11-28 13:11:58.124551	2025-11-28 13:11:58.124551	6daa1dd6-9bde-4a99-935c-145e4544e464	3987f57e-5118-4e3e-88a5-13f4406a5d26	1234756712457324jghjrgrhjew8643783624hjgwhewj
eedc491e-b29f-481e-aea9-1dcbf6ad3006	0.9	400	300	2025-11-28 13:11:51.324542	2025-11-28 13:11:51.324542	6daa1dd6-9bde-4a99-935c-145e4544e464	3987f57e-5118-4e3e-88a5-13f4406a5d26	1234756712457324jghjrgrhjew8643783624hjgwhewj
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_orders (id, po_number, vendor_id, site_id, description, quantity, unit_price, total_amount, po_date, due_date, status, approved_by, approval_date, remarks, created_at, updated_at, gst_type, igst_percentage, igst_amount, cgst_percentage, cgst_amount, sgst_percentage, sgst_amount, gst_apply) FROM stdin;
\.


--
-- Data for Name: salary_structures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.salary_structures (id, employee_id, basic_salary, hra, da, lta, conveyance, medical, bonuses, other_benefits, pf, professional_tax, income_tax, epf, esic, created_at, updated_at, want_deduction) FROM stdin;
38da0f87-11e0-41f6-a351-e202061affa3	18132d05-6c18-4d96-aeba-dee2c633e44a	5555.555555555556	2777.7777777777783	1111.111111111111	555.5555555555555	0	0	0	0	666.6666666666667	0	0	203.8888888888889	41.66666666666667	2025-11-29 09:40:15.101764	2025-11-29 09:40:15.101764	t
92636d52-979d-4818-877a-0f5a61ed10fd	e61583d1-b735-4359-b5f3-545003ac0403	18000	9000	3600	1800	0	0	0	0	2160	0	0	660.6	135	2025-11-29 10:36:23.875903	2025-11-29 10:36:23.875903	t
5f5ed5d7-ecb0-4a90-931d-25075823f6e2	ffa78016-7969-44b7-bbad-5ff3981d3cde	36111.11	18055.555	7222.222	3611.111	5000	5000	0	0	0	0	0	0	0	2025-11-29 09:58:50.386596	2025-11-29 09:58:50.386596	f
\.


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sites (id, site_id, vendor_id, plan_id, site_amount, vendor_amount, status, created_at, updated_at, s_no, circle, nominal_aop, hop_type, hop_a_b, hop_b_a, district, project, site_a_ant_dia, site_b_ant_dia, max_ant_size, site_a_name, toco_vendor_a, toco_id_a, site_b_name, toco_vendor_b, toco_id_b, media_availability_status, sr_no_site_a, sr_date_site_a, sr_no_site_b, sr_date_site_b, hop_sr_date, sp_date_site_a, sp_date_site_b, hop_sp_date, so_released_date_site_a, so_released_date_site_b, hop_so_date, rfai_offered_date_site_a, rfai_offered_date_site_b, actual_hop_rfai_offered_date, partner_name, rfai_survey_completion_date, mo_number_site_a, material_type_site_a, mo_date_site_a, mo_number_site_b, material_type_site_b, mo_date_site_b, srn_rmo_number, srn_rmo_date, hop_mo_date, hop_material_dispatch_date, hop_material_delivery_date, material_delivery_status, site_a_installation_date, ptw_number_site_a, ptw_status_a, site_b_installation_date, ptw_number_site_b, ptw_status_b, hop_ic_date, alignment_date, hop_installation_remarks, visible_in_nms, nms_visible_date, soft_at_offer_date, soft_at_acceptance_date, soft_at_status, phy_at_offer_date, phy_at_acceptance_date, phy_at_status, both_at_status, pri_issue_category, pri_site_id, pri_open_date, pri_close_date, pri_history, rfi_survey_allocation_date, descope, reason_of_extra_visit, wcc_received_80_percent, wcc_received_date_80_percent, wcc_received_20_percent, wcc_received_date_20_percent, wcc_received_date_100_percent, survey, final_partner_survey, survey_date, zone_id) FROM stdin;
bd1e4c70-75b0-4369-82c0-84ec844f952d	456789098765ff456hnn	d5255088-295e-4382-b418-9d7035d950fc	456789098765ff456hnn	\N	\N	Approved	2025-11-28 11:10:11.33098	2025-11-28 11:10:11.33098	2	UPE	AOP 24-25	E-BAND	ALB45-ALBI06	ALBI06-ALB45	Prayagraj	Ceragon-Bharti	1.2	0.6	1.2	Darbhanga	Infratel	UERT11223	Darbhanga	Space Telecom	STIPL-UPE-657			\N		\N	\N	\N	\N	\N	\N	\N	\N	2024-12-21	2024-12-21	2024-12-21	Lagom	2024-12-21			\N			\N		\N	\N	2024-12-24	2024-12-25	Received	2024-12-26			2024-12-27			2024-12-27	\N	LOS Issue/Mail Approval taken for Installation only		\N	\N	\N	Approved	\N	\N	Approved		LOS Issue		\N	\N		\N				\N		\N	\N		LAGOM	\N	cf451bc7-4b7a-4e0a-9c2d-e61cc35b1d03
6daa1dd6-9bde-4a99-935c-145e4544e464	AOP 24-25	3987f57e-5118-4e3e-88a5-13f4406a5d26	1234756712457324jghjrgrhjew8643783624hjgwhewj	\N	\N	Pending	2025-11-28 11:10:10.52556	2025-11-28 11:10:10.52556	1	UPE	AOP 24-25	E-BAND	ALB368-ACNT04	ACNT04-ALB368	Prayagraj	Ceragon-Bharti	0.9	0.9	0.9	Patrakarcolony	Indus	IN-1360937	Patrakarcolony	TVI	ATUPALH1165	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-22	2024-12-22	2024-12-22	Jiya	2024-12-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-24	2024-12-25	Received	2024-12-26	Approved In Inside	\N	2024-12-26	Approved In Inside	\N	2024-12-26	2024-12-26	Site done	Yes	2024-12-26	2025-01-02	2025-01-02	Raised	2025-01-01	2025-01-02	Raised	Yes	-	\N	\N	\N	\N	\N	\N	\N	Done	2025-02-21	Done	2025-02-21	2025-02-21	\N	JIYA	\N	cf451bc7-4b7a-4e0a-9c2d-e61cc35b1d03
302f3d2b-00ef-401a-8f0f-a040f76a8bdb	AOP 24-25-46wotmvi	538ac95f-2f48-40b1-8573-275ec9335509	ASDR23454567	\N	\N	Pending	2025-12-01 12:48:59.102862	2025-12-01 12:48:59.102862	3	UPE	AOP 24-25	E-BAND	ALB47-ALBI08	ALB48-ALBI07	Prayagraj	Ceragon-Bharti	1.2	0.6	1.2	Darbhanga	Infratel	UERT11223	Darbhanga	Space Telecom	STIPL-UPE-657	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-21	2024-12-21	2024-12-21	QAII	2024-12-21	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-24	2024-12-25	Received	2024-12-26	\N	\N	2024-12-27	\N	\N	2024-12-27	\N	LOS Issue/Mail Approval taken for Installation only	\N	\N	\N	\N	Raised	\N	\N	Raised	\N	LOS Issue	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	QAII	\N	cf451bc7-4b7a-4e0a-9c2d-e61cc35b1d03
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.team_members (id, team_id, employee_id, created_at, updated_at, reporting_person_1, reporting_person_2, reporting_person_3) FROM stdin;
ea877234-f243-4551-a3ef-fd1e8a9c2bab	8d842575-1607-41f4-ba69-1b4d2bcea583	ffa78016-7969-44b7-bbad-5ff3981d3cde	2025-11-29 20:23:54.060914	2025-11-29 20:23:54.060914	bbb8c5cb-89d0-48a8-9831-58e8e57c9e14	ea877234-f243-4551-a3ef-fd1e8a9c2bab	\N
bbb8c5cb-89d0-48a8-9831-58e8e57c9e14	8d842575-1607-41f4-ba69-1b4d2bcea583	18132d05-6c18-4d96-aeba-dee2c633e44a	2025-11-29 20:23:54.086563	2025-11-29 20:23:54.086563	bbb8c5cb-89d0-48a8-9831-58e8e57c9e14	ea877234-f243-4551-a3ef-fd1e8a9c2bab	\N
9bca3b6a-7826-40f4-ad88-20a7c2a06830	8d842575-1607-41f4-ba69-1b4d2bcea583	e61583d1-b735-4359-b5f3-545003ac0403	2025-11-29 20:23:54.075772	2025-11-29 20:23:54.075772	bbb8c5cb-89d0-48a8-9831-58e8e57c9e14	ea877234-f243-4551-a3ef-fd1e8a9c2bab	\N
dbaddaab-3f2c-4431-aa4e-e6d8685f3937	c5ae7eba-56e5-46f3-9983-810a47702866	e61583d1-b735-4359-b5f3-545003ac0403	2025-11-30 11:46:25.270619	2025-11-30 11:46:25.270619	4ddc2643-36b5-47cb-9a38-7a82c13c7b50	\N	\N
4ddc2643-36b5-47cb-9a38-7a82c13c7b50	c5ae7eba-56e5-46f3-9983-810a47702866	18132d05-6c18-4d96-aeba-dee2c633e44a	2025-11-30 11:46:25.283276	2025-11-30 11:46:25.283276	4ddc2643-36b5-47cb-9a38-7a82c13c7b50	\N	\N
48a6aad4-3cda-4789-ab8f-9b38756ce4e7	c5ae7eba-56e5-46f3-9983-810a47702866	ffa78016-7969-44b7-bbad-5ff3981d3cde	2025-11-30 11:47:38.84815	2025-11-30 11:47:38.84815	4ddc2643-36b5-47cb-9a38-7a82c13c7b50	\N	\N
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.teams (id, name, description, created_at, updated_at) FROM stdin;
8d842575-1607-41f4-ba69-1b4d2bcea583	IT Team 1		2025-11-29 17:10:15.486134	2025-11-29 17:10:15.486134
b8a4d7db-0fd3-483c-8724-dd92ffbc1aca	IT Team 2		2025-11-29 17:12:06.982889	2025-11-29 17:12:06.982889
f240279c-193b-46f9-9cc5-030be2752b00	OP Team 1		2025-11-29 17:32:19.829883	2025-11-29 17:32:19.829883
3c8093be-8664-4cb8-bb3c-e657e6252c1a	OP Team 2		2025-11-29 17:34:21.28027	2025-11-29 17:34:21.28027
c5ae7eba-56e5-46f3-9983-810a47702866	HR Team 3		2025-11-30 11:46:01.740001	2025-11-30 11:46:01.740001
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vendors (id, name, email, mobile, address, city, state, pincode, country, aadhar, pan, gstin, moa, category, status, created_at, updated_at, password, role, vendor_code) FROM stdin;
3987f57e-5118-4e3e-88a5-13f4406a5d26	Jiya	Jiya@vendor.local	4567898765	sdfsdf	Lucknow	Uttar Pradesh	234567	India				\N	Individual	Approved	2025-11-28 10:51:10.548385	2025-11-28 10:51:10.548385	$2b$10$eisseRIYmLtE8nmvGEncOuEFSaGXfDIr36SUY32xerl3MfaDa7qgS	Vendor	1001
d5255088-295e-4382-b418-9d7035d950fc	Lagom	Lagom@vendor.local	9389765678	dgfdgfdg	Visakhapatnam	Andhra Pradesh	345678	India	TEMP1764327071552	TEMP1764327071552		\N	Individual	Approved	2025-11-28 10:51:11.562791	2025-11-28 10:51:11.562791	$2b$10$pI05eRdOYJq0q3zvJCtWc.XuafQQ1RdTzxs8FA4R2Z6N7Y//T255.	Vendor	1002
538ac95f-2f48-40b1-8573-275ec9335509	QAII	QAII@vendor.local						India	TEMP1764591862488	TEMP1764591862488	\N	\N	Individual	Pending	2025-12-01 12:24:22.500014	2025-12-01 12:24:22.500014	$2b$10$i/BallGywR0TXs3RH9mwQu7H.443asuCVvf/fUS2zsp.iwpILRoM2	Vendor	1003
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.zones (id, name, short_name, created_at, updated_at) FROM stdin;
cf451bc7-4b7a-4e0a-9c2d-e61cc35b1d03	Uttar Pradesh East	UPE	2025-11-27 18:52:14.06489	2025-11-27 18:52:14.06489
022a2653-5088-4afe-81db-893c87fe75c1	Uttar Pradesh West	UPW	2025-11-27 18:53:50.983612	2025-11-27 18:53:50.983612
\.


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: daily_allowances daily_allowances_employee_id_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.daily_allowances
    ADD CONSTRAINT daily_allowances_employee_id_date_key UNIQUE (employee_id, date);


--
-- Name: daily_allowances daily_allowances_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.daily_allowances
    ADD CONSTRAINT daily_allowances_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designations designations_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_key UNIQUE (name);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_unique UNIQUE (email);


--
-- Name: employees employees_mobile_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_mobile_unique UNIQUE (mobile);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: export_headers export_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.export_headers
    ADD CONSTRAINT export_headers_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: payment_masters payment_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_masters
    ADD CONSTRAINT payment_masters_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_unique UNIQUE (po_number);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: sites sites_site_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_site_id_unique UNIQUE (site_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_aadhar_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_aadhar_unique UNIQUE (aadhar);


--
-- Name: vendors vendors_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_email_unique UNIQUE (email);


--
-- Name: vendors vendors_pan_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pan_unique UNIQUE (pan);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: zones zones_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_name_unique UNIQUE (name);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: zones zones_short_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_short_name_unique UNIQUE (short_name);


--
-- Name: idx_approval_count; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_approval_count ON public.daily_allowances USING btree (approval_count);


--
-- Name: idx_approval_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_approval_status ON public.daily_allowances USING btree (approval_status);


--
-- Name: idx_daily_allowances_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_allowances_date ON public.daily_allowances USING btree (date);


--
-- Name: idx_daily_allowances_employee_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_allowances_employee_id ON public.daily_allowances USING btree (employee_id);


--
-- Name: idx_employee_month_year; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employee_month_year ON public.attendances USING btree (employee_id, month, year);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_department ON public.employees USING btree (department_id);


--
-- Name: idx_employees_designation; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_designation ON public.employees USING btree (designation_id);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_invoice_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invoice_date ON public.invoices USING btree (invoice_date);


--
-- Name: idx_invoice_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invoice_po ON public.invoices USING btree (po_id);


--
-- Name: idx_invoice_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invoice_status ON public.invoices USING btree (status);


--
-- Name: idx_invoice_vendor; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invoice_vendor ON public.invoices USING btree (vendor_id);


--
-- Name: idx_paid_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_paid_status ON public.daily_allowances USING btree (paid_status);


--
-- Name: idx_payment_antenna; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_antenna ON public.payment_masters USING btree (antenna_size);


--
-- Name: idx_payment_site; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_site ON public.payment_masters USING btree (site_id);


--
-- Name: idx_payment_vendor; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_vendor ON public.payment_masters USING btree (vendor_id);


--
-- Name: idx_po_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_date ON public.purchase_orders USING btree (po_date);


--
-- Name: idx_po_site; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_site ON public.purchase_orders USING btree (site_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_po_vendor; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_vendor ON public.purchase_orders USING btree (vendor_id);


--
-- Name: idx_salary_employee; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_salary_employee ON public.salary_structures USING btree (employee_id);


--
-- Name: idx_sites_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sites_status ON public.sites USING btree (status);


--
-- Name: idx_sites_vendor; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sites_vendor ON public.sites USING btree (vendor_id);


--
-- Name: idx_sites_zone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sites_zone ON public.sites USING btree (zone_id);


--
-- Name: idx_team_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_id ON public.daily_allowances USING btree (team_id);


--
-- Name: idx_team_members_employee; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_employee ON public.team_members USING btree (employee_id);


--
-- Name: idx_team_members_rp1; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_rp1 ON public.team_members USING btree (reporting_person_1);


--
-- Name: idx_team_members_rp2; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_rp2 ON public.team_members USING btree (reporting_person_2);


--
-- Name: idx_team_members_rp3; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_rp3 ON public.team_members USING btree (reporting_person_3);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_vendors_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vendors_email ON public.vendors USING btree (email);


--
-- Name: idx_vendors_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vendors_status ON public.vendors USING btree (status);


--
-- Name: attendances attendances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: daily_allowances daily_allowances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.daily_allowances
    ADD CONSTRAINT daily_allowances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: daily_allowances daily_allowances_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.daily_allowances
    ADD CONSTRAINT daily_allowances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: employees employees_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_designation_id_designations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_designation_id_designations_id_fk FOREIGN KEY (designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: invoices invoices_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: payment_masters payment_masters_site_id_sites_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_masters
    ADD CONSTRAINT payment_masters_site_id_sites_id_fk FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: payment_masters payment_masters_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_masters
    ADD CONSTRAINT payment_masters_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_orders purchase_orders_site_id_sites_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_site_id_sites_id_fk FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: salary_structures salary_structures_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: sites sites_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: sites sites_zone_id_zones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_zone_id_zones_id_fk FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: team_members team_members_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict gvLpbyNVAXqiCrfouRkYc48k0WkLoHh3HmYAp5iHyflodA4DlaytpUe7HUTWdaV

