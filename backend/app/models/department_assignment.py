from ..extensions import db, iso, utcnow


class DepartmentAssignment(db.Model):
    """Routing / assignment / transfer history for a complaint."""

    __tablename__ = "department_assignments"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    office_id = db.Column(db.Integer, db.ForeignKey("offices.id"))
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    # auto_routing | unmapped | manual | transfer | office_transfer | manual_routing
    reason = db.Column(db.String(30), nullable=False, default="auto_routing")
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="assignments")
    department = db.relationship("Department")
    office = db.relationship("Office")
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = db.relationship("User", foreign_keys=[assigned_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "department": self.department.to_brief() if self.department else None,
            "office": self.office.to_brief() if self.office else None,
            "assigned_to": self.assigned_to.to_brief() if self.assigned_to else None,
            "assigned_by": self.assigned_by.to_brief() if self.assigned_by else None,
            "reason": self.reason,
            "note": self.note,
            "created_at": iso(self.created_at),
        }
