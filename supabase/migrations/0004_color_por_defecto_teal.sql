-- LibroClaro · 0004  (aplicada el 2026-09-12)
-- La marca pasó de azul a verde azulado. El color por defecto de un negocio
-- nuevo seguía en azul, así que un cliente Pro que nunca eligiera color
-- habría visto su formulario en el color viejo.
alter table public.businesses
  alter column primary_color set default '#0f766e';

-- Los negocios que nunca personalizaron su color quedan alineados.
update public.businesses
   set primary_color = '#0f766e'
 where primary_color = '#1d4ed8';
