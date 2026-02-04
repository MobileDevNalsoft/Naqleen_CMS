select URL, count(*) from apex_webservice_log where trunc(request_date) = trunc(sysdate-1) group by URL order by 2 desc;


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





