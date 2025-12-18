begin
   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'swapReservationContainers'
   );
   ords.define_handler(
      p_module_name    => 'otm_web',
      p_pattern        => 'swapReservationContainers',
      p_method         => 'POST',
      p_source_type    => ords.source_type_plsql,
      p_source         => 'BEGIN XX_OTM_SWAP_RESERVATION_CONTAINERS(:body); END;',
      p_items_per_page => 0
   );
   commit;
end;
/