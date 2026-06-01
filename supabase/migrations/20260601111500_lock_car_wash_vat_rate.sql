alter table public.companies
  alter column vat_rate set default 15;

update public.companies
   set vat_rate = 15
 where (business_type = 'car_wash' or industry = 'car_wash')
   and vat_rate is distinct from 15;
