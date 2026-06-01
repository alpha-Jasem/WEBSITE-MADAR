alter table public.companies
  alter column price_includes_vat set default true;

update public.companies
   set price_includes_vat = true
 where (business_type = 'car_wash' or industry = 'car_wash')
   and price_includes_vat is distinct from true;
