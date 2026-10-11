from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db, iso, utcnow

# "employee" is the legacy department-staff role and is treated as an officer.
ROLES = ("citizen", "officer", "field_worker", "admin", "employee")
STAFF_ROLES = ("officer", "field_worker", "admin", "employee")
OFFICER_ROLES = ("officer", "employee", "admin")
ROLE_LABELS = {
    "citizen": "Citizen",
    "officer": "Municipal / Panchayat Officer",
    "employee": "Municipal / Panchayat Officer",
    "field_worker": "Field Worker",
    "admin": "Administrator",
}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(32))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="citizen", index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), index=True)
    office_id = db.Column(db.Integer, db.ForeignKey("offices.id"), index=True)
    ward_id = db.Column(db.Integer, db.ForeignKey("wards.id"), index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    department = db.relationship("Department", back_populates="staff")
    office = db.relationship("Office", back_populates="staff", foreign_keys=[office_id])
    ward = db.relationship("Ward", foreign_keys=[ward_id])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return bool(self.password_hash) and check_password_hash(self.password_hash, password)

    @property
    def is_staff(self):
        return self.role in STAFF_ROLES

    @property
    def is_officer(self):
        return self.role in OFFICER_ROLES

    @property
    def is_field_worker(self):
        return self.role == "field_worker"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "role_label": ROLE_LABELS.get(self.role, self.role),
            "is_staff": self.is_staff,
            "department": self.department.to_brief() if self.department else None,
            "office": self.office.to_brief() if self.office else None,
            "ward": self.ward.to_brief() if self.ward else None,
            "is_active": self.is_active,
            "created_at": iso(self.created_at),
        }

    def to_brief(self):
        return {"id": self.id, "name": self.name, "role": self.role}
