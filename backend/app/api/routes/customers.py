from fastapi import APIRouter, Query, status

from app.api.deps import DbSession
from app.schemas.customer import CustomerIn, CustomerOut
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(db: DbSession, search: str | None = Query(None, max_length=100)):
    return customer_service.list_customers(db, search)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerIn, db: DbSession):
    return customer_service.create_customer(db, data)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: DbSession):
    return customer_service.get_customer(db, customer_id)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, data: CustomerIn, db: DbSession):
    return customer_service.update_customer(db, customer_id, data)
