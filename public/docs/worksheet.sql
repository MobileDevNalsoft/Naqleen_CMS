select count(*) from apex_webservice_log where trunc(request_date) = trunc(sysdate);


select container_type,
          sum(
             case
                when container_nbr is null then
                   1
                else
                   0
             end
          ) as total,
          sum(
             case
                when container_nbr is not null
                   and position is not null then
                   1
                else
                   0
             end
          ) as reserved
     from xxotm_container_inventory_t
    where cust_nbr = 'MSC'
      and booking_id = 'BOOKING NO -18'
      and container_type is not null
      and container_released_time is null
    group by container_type
    having sum(
           case
               when container_nbr is null then 1
               else 0
           end
       ) > 0
    order by container_type;


select container_nbr
        from xxotm_container_inventory_t
       where container_type = '45GP'
         and cust_nbr = 'MSC'
         and booking_id is null
         and container_released_time is null
         and outbound_shipment_nbr is null
         and position is not null
         and container_stored_time is not null
         and inbound_shipment_nbr is not null
       order by to_date(container_stored_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') asc;




select container_type,
          sum(
             case
                when container_nbr is null then
                   1
                else
                   0
             end
          ) as total,
          sum(
             case
                when container_nbr is not null
                   and position is not null then
                   1
                else
                   0
             end
          ) as reserved
     from xxotm_container_inventory_t
    where cust_nbr = 'A1179'
      and booking_id = 'MSC NAPOLI  -OW606R'
      and container_type is not null
      and container_released_time is null
    group by container_type
    having sum(
      case
         when container_nbr is null then
            1
         else
            0
      end
   ) > 0
    order by container_type;


select COUNT(container_nbr)
        from xxotm_container_inventory_t
       where cust_nbr = 'A1179'
         and booking_id = 'MSC NAPOLI  -OW606R'
         and container_type = '45GP'
         and container_nbr is not null
         and position is not null
         and container_released_time is null
       order by container_nbr;

select COUNT(container_type)
     from xxotm_container_inventory_t
    where cust_nbr = 'A1179'
      and booking_id = 'MSC NAPOLI  -OW606R'
      and container_type = '45GP'
      and container_nbr is null
    order by container_type;


select COUNT(container_nbr)
        from xxotm_container_inventory_t
       where cust_nbr = 'A1179'
         and booking_id = 'MSC NAPOLI  -OW606R'
         and container_type = '20GP'
         and container_nbr is not null
         and position is not null
         and container_released_time is null
       order by container_nbr;

select COUNT(container_type)
     from xxotm_container_inventory_t
    where cust_nbr = 'A1179'
      and booking_id = 'MSC NAPOLI  -OW606R'
      and container_type = '20GP'
      and container_nbr is null
    order by container_type;


select inbound_shipment_nbr, count(inbound_shipment_nbr) from xxotm_container_inventory_t group by inbound_shipment_nbr having count(inbound_shipment_nbr) > 1;


select * from xxotm_container_inventory_t where container_nbr = 'MSNU7425389';



select event_date,
                   vehicle_xid,
                   truck_daily_status,
                   driver_xid,
                   equipment
              from xxotm_vehicle_history_t
             where truck_daily_status is not null
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between to_date(
               '2026-02-01',
               'YYYY-MM-DD') and to_date(
               '2026-02-28',
               'YYYY-MM-DD')
             order by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') desc,
                      vehicle_xid;



delete from xxotm_container_inventory_t where container_nbr = 'JANN1234574';
commit;

select * from xxotm_container_inventory_t where container_nbr = 'JANN1234574';

insert into xxotm_container_inventory_t (container_nbr, cust_nbr, cust_name, inbound_order_nbr, inbound_shipment_nbr, position, container_type, booking_id, container_stored_time, shipment_name, order_type) values ('JANN1234574', 'C50', 'JAS FREIGHT FORWARDER', '20260102-0003-002', 'SH20260102-0039', 'TRS-A-3-D-1', '22RT', 'BKJAN0203', '2026-01-06T04:32:42Z', 'DESTUFFING', 'DESTUFFING');
commit;
