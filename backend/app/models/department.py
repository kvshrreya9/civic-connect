from ..extensions import db, iso, utcnow


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    categories = db.Column(db.JSON, nullable=False, default=list)
    sla_hours = db.Column(db.Integer, nullable=False, default=72)
    contact_email = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    staff = db.relationship("User", back_populates="department")
    complaints = db.relationship("Complaint", back_populates="department")

    def to_brief(self):
        return {"id": self.id, "name": self.name, "code": self.code}

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "categories": list(self.categories or []),
            "sla_hours": self.sla_hours,
            "contact_email": self.contact_email,
            "is_active": self.is_active,
            "created_at": iso(self.created_at),
        }
