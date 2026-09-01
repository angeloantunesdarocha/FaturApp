-- Registros anteriores à fonte única não tinham o campo de saída direta.
-- Quando só há abastecimento e nenhuma distância, o valor pago no posto
-- precisa continuar compondo os custos do dia.
update public.daily_entries
set isolated_fuel_expense = coalesce(gas_expense, 0) + coalesce(alcohol_expense, 0)
where coalesce(isolated_fuel_expense, 0) = 0
  and jsonb_typeof(coalesce(launch_details, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(launch_details, '[]'::jsonb)) = 0
  and coalesce(km_final, 0) <= coalesce(km_initial, 0)
  and coalesce(gas_expense, 0) + coalesce(alcohol_expense, 0) > 0;
