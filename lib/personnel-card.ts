type AnyRecord = Record<string, any>;

export function hasNinValue(record: AnyRecord | null | undefined) {
  return Boolean(
    record?.nin ||
    record?.NIN ||
    record?.metadata?.nin ||
    record?.metadata?.NIN ||
    record?.verification?.nin ||
    record?.personal?.nin
  );
}

export function buildPersonnelCardData(input: {
  employee?: AnyRecord | null;
  registration?: AnyRecord | null;
  verification?: AnyRecord | null;
  personal?: AnyRecord | null;
  pending?: AnyRecord | null;
}) {
  const employee = input.employee ?? {};
  const registration = input.registration ?? {};
  const verification = input.verification ?? {};
  const personal = input.personal ?? {};
  const pending = input.pending ?? {};
  const metadata = employee.metadata ?? pending.metadata ?? {};
  const source = Object.keys(employee).length > 0 ? employee : Object.keys(pending).length > 0 ? pending : personal;

  return {
    id: employee.id ?? pending.id ?? registration.id ?? null,
    registration_id: employee.registration_id ?? pending.registration_id ?? registration.registration_id ?? personal.registration_id ?? null,
    nin: employee.nin ?? registration.nin ?? verification.nin ?? metadata.NIN ?? personal.nin ?? null,
    ninVerified: Boolean(metadata.ninVerified ?? metadata["NIN Verified"] ?? false),
    name: employee.name ?? `${personal.first_name ?? pending.firstname ?? metadata["First Name"] ?? ""} ${personal.surname ?? pending.surname ?? metadata["Surname"] ?? ""}`.trim(),
    email: employee.email ?? pending.email ?? personal.email ?? verification.email ?? null,
    department: employee.department ?? pending.department ?? null,
    position: employee.position ?? pending.position ?? null,
    status: employee.status ?? pending.status ?? registration.status ?? null,
    join_date: employee.join_date ?? null,
    hire_date: employee.hire_date ?? null,
    date_of_birth: employee.date_of_birth ?? personal.date_of_birth ?? verification.birthdate ?? null,
    marital_status: employee.marital_status ?? personal.marital_status ?? verification.maritalstatus ?? null,
    gender: employee.gender ?? personal.sex ?? verification.gender ?? null,
    state_of_origin: employee.state_of_origin ?? personal.state_of_origin ?? verification.state_of_origin ?? null,
    lga_origin: employee.lga_origin ?? metadata["LGA Of Origin"] ?? null,
    job_title: employee.job_title ?? null,
    assignment_status: employee.assignment_status ?? metadata["Assignment Status"] ?? null,
    location: employee.location ?? metadata["Location"] ?? null,
    zone: employee.zone ?? metadata["Zone"] ?? null,
    supervisor: employee.supervisor ?? metadata["Supervisor"] ?? null,
    command: employee.command ?? metadata["Command"] ?? null,
    grade_category: employee.grade_category ?? metadata["Grade Category"] ?? null,
    grade: employee.grade ?? metadata["Grade"] ?? null,
    step: employee.step ?? metadata["Step"] ?? null,
    salary: employee.salary ?? null,
    residence_address: employee.residence_address ?? personal.address_state_of_residence ?? metadata["Residence Address"] ?? null,
    contact_address: employee.contact_address ?? metadata["Contact Address"] ?? null,
    telephone_number: employee.telephone_number ?? personal.phone_number ?? verification.telephoneno ?? metadata["Telephone Number"] ?? null,
    nationality: employee.nationality ?? metadata["Nationality"] ?? null,
    bank_name: employee.bank_name ?? metadata["Bank Name"] ?? null,
    sort_code: employee.sort_code ?? metadata["Sort Code"] ?? null,
    account_number: employee.account_number ?? metadata["Account Number"] ?? null,
    pfa_name: employee.pfa_name ?? metadata["PFA Name"] ?? null,
    pin_number: employee.pin_number ?? metadata["Pin Number"] ?? null,
    payroll_group: employee.payroll_group ?? metadata["Payroll Group"] ?? null,
    staff_category: employee.staff_category ?? metadata["Staff Category"] ?? null,
    date_terminated: employee.date_terminated ?? null,
    legacy_id: employee.legacy_id ?? metadata["Legacy ID"] ?? null,
    assignment_start_date: employee.assignment_start_date ?? null,
    person_start_date: employee.person_start_date ?? null,
    date_of_last_promotion: employee.date_of_last_promotion ?? null,
    unit: employee.unit ?? metadata["Unit"] ?? null,
    organization_name: employee.organization_name ?? metadata["Organization Name"] ?? null,
    employee_type: employee.employee_type ?? metadata["Employee Type"] ?? null,
    bvn: employee.bvn ?? metadata["BVN"] ?? null,
    tax_id: employee.tax_id ?? metadata["Tax Id"] ?? null,
    verification_id: employee.verification_id ?? null,
    first_name: personal.first_name ?? metadata["First Name"] ?? pending.firstname ?? null,
    surname: personal.surname ?? metadata["Surname"] ?? pending.surname ?? null,
    other_names: personal.other_names ?? metadata["Other Names"] ?? null,
    phone_number: personal.phone_number ?? verification.telephoneno ?? metadata["Telephone Number"] ?? null,
    sex: employee.gender ?? personal.sex ?? verification.gender ?? null,
    state_of_residence: personal.state_of_residence ?? metadata["State Of Residence"] ?? null,
    lga: personal.lga ?? metadata["LGA Of Origin"] ?? null,
    address_state_of_residence: personal.address_state_of_residence ?? metadata["Address State Of Residence"] ?? null,
    next_of_kin_name: personal.next_of_kin_name ?? metadata["Next Of Kin Name"] ?? null,
    next_of_kin_relationship: personal.next_of_kin_relationship ?? metadata["Next Of Kin Relationship"] ?? null,
    next_of_kin_phone_number: personal.next_of_kin_phone_number ?? metadata["Next Of Kin Phone Number"] ?? null,
    next_of_kin_address: personal.next_of_kin_address ?? metadata["Next Of Kin Address"] ?? null,
    showVerifyNin: !hasNinValue({ ...source, verification, personal }),
  };
}
