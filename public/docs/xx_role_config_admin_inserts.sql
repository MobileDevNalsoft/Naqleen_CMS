-- Insert screens for ADMIN role into XX_ROLE_CONFIG
-- Table Structure: ROLE, SCREEN_NAME, SCREEN_PATH, IS_ACTIVE, CREATED_DATE, CREATED_BY, LAST_UPDATED_DATE, LAST_UPDATED_BY

-- First, check existing screens for ADMIN role
-- SELECT * FROM XX_ROLE_CONFIG WHERE ROLE = 'ADMIN';

-- Insert all screens for ADMIN with active access
-- Using MERGE to avoid duplicates

merge into xx_role_config rc
using (
   select 'ADMIN' as role,
          'Dashboard' as screen_name,
          '/dashboard' as screen_path
     from dual
   union all
   select 'ADMIN',
          'Gate Operations',
          '/gate'
     from dual
   union all
   select 'ADMIN',
          'Yard View',
          '/yard'
     from dual
   union all
   select 'ADMIN',
          'User Management',
          '/admin/users'
     from dual
   union all
   select 'ADMIN',
          'Position Container',
          '/position'
     from dual
   union all
   select 'ADMIN',
          'Restack Containers',
          '/restack'
     from dual
   union all
   select 'ADMIN',
          'Gate In',
          '/gate-in'
     from dual
   union all
   select 'ADMIN',
          'Gate Out',
          '/gate-out'
     from dual
   union all
   select 'ADMIN',
          'Stuffing',
          '/stuffing'
     from dual
   union all
   select 'ADMIN',
          'Destuffing',
          '/destuffing'
     from dual
   union all
   select 'ADMIN',
          'Plug In/Out',
          '/plug-in-out'
     from dual
   union all
   select 'ADMIN',
          'CFS Task Assignment',
          '/cfs-task'
     from dual
   union all
   select 'ADMIN',
          'Reserve Containers',
          '/reserve-containers'
     from dual
   union all
   select 'ADMIN',
          'Release Container',
          '/release-container'
     from dual
   union all
   select 'ADMIN',
          'Customer Inventory',
          '/customer-inventory'
     from dual
   union all
   select 'ADMIN',
          'Settings',
          '/settings'
     from dual
   union all
   select 'ADMIN',
          'Role Management',
          '/settings/roles'
     from dual
   union all
   select 'ADMIN',
          'Invalid Containers',
          '/invalid-containers'
     from dual
   union all
   select 'ADMIN',
          'CFS Area',
          '/cfs'
     from dual
) src on ( rc.role = src.role
   and rc.screen_name = src.screen_name )
when matched then update
set rc.screen_path = src.screen_path,
    rc.is_active = 'Y',
    rc.last_updated_date = sysdate,
    rc.last_updated_by = user
when not matched then
insert (
   role,
   screen_name,
   screen_path,
   is_active,
   created_date,
   created_by,
   last_updated_date,
   last_updated_by )
values
   ( src.role,
     src.screen_name,
     src.screen_path,
     'Y',
     sysdate,
     user,
     sysdate,
     user );

commit;

-- Verify insertion
select *
  from xx_role_config
 where role = 'ADMIN'
 order by screen_name;