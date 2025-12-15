-- ========================================
-- APEX ORDS API Setup for XXOTM Schema
-- ========================================

-- Enable ORDS for XXOTM schema
begin
   ords.enable_schema(
      p_schema             => 'XXOTM',
      p_url_mapping_prefix => 'xxotm'
   );
   commit;
end;
/

-- ========================================
-- Security Authentication Module
-- ========================================

-- User Validation API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'validateUser'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'validateUser',
      p_method        => 'POST',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_VALIDATE_USER(:email, :password); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Get Available Roles API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getAvailableRoles'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getAvailableRoles',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_AVAILABLE_ROLES; END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Get Available Screens API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getAvailableScreens'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getAvailableScreens',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_AVAILABLE_SCREENS; END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Get Role Info API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getRoleInfo'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getRoleInfo',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_ROLE_INFO(:role); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Update Role Access API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'updateRoleAccess'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'updateRoleAccess',
      p_method        => 'PUT',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_UPDATE_ROLE_ACCESS(:body); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Update Driver Location API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'updateCurrentLocation'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'updateCurrentLocation',
      p_method        => 'POST',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_UPDATE_CURRENT_LOCATION(:body); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Get Driver Location API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getDriverLocation'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getDriverLocation',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_DRIVER_LOCATION(:driver_id); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Get Active Shipments API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getActiveShipments'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getActiveShipments',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_ACTIVE_SHIPMENTS; END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

-- Update Stop Status API
begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'updateStopStatus'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'updateStopStatus',
      p_method        => 'PUT',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_UPDATE_STOP_STATUS(:stop_id, :body); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getTrackingContainers'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getTrackingContainers',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN xx_otm_get_tracking_containers(:p_search_text); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;
/

begin
   ords.define_template(
      p_module_name => 'otm_mobile',
      p_pattern     => 'getContainerRepairStatus'
   );
   ords.define_handler(
      p_module_name   => 'otm_mobile',
      p_pattern       => 'getContainerRepairStatus',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_CONTAINER_REPAIR_STATUS(:container_nbr); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;

begin
   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'getContainers'
   );
   ords.define_handler(
      p_module_name   => 'otm_web',
      p_pattern       => 'getContainers',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_CONTAINERS; END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;

begin
   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'getCustomersAndBookings'
   );
   ords.define_handler(
      p_module_name   => 'otm_web',
      p_pattern       => 'getCustomersAndBookings',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_CUSTOMERS_AND_BOOKINGS; END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;

begin
   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'getContainerDetails'
   );
   ords.define_handler(
      p_module_name   => 'otm_web',
      p_pattern       => 'getContainerDetails',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XX_OTM_GET_CONTAINER_DETAILS(:p_container_nbr); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;

commit;