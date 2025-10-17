"""
Utility functions for financial calculations
"""


def calculate_monthly_payment(principal: int, interest_amount: int, months: int) -> int:
    """
    Calculate monthly payment amount
    principal: Loan amount (số tiền vay)
    interest_amount: Fixed interest amount per payment period (lãi suất cố định, ví dụ: 10 đồng)
    months: Number of months (số kỳ đóng)
    
    Returns: Monthly payment = (principal / months) + interest_amount
    """
    principal_per_month = principal // months
    return principal_per_month + interest_amount


def calculate_total_payment(principal: int, interest_amount: int, months: int) -> int:
    """
    Calculate total payment amount (principal + total interest)
    principal: Loan amount
    interest_amount: Fixed interest amount per payment period
    months: Number of months
    
    Returns: Total = principal + (interest_amount * months)
    """
    return principal + (interest_amount * months)


def calculate_remaining_amount(principal: int, interest_amount: int, months: int, paid_amount: int) -> int:
    """
    Calculate remaining amount to pay
    principal: Loan amount
    interest_amount: Fixed interest amount per payment period
    months: Number of months
    paid_amount: Amount already paid
    
    Returns: Remaining amount
    """
    total_amount = calculate_total_payment(principal, interest_amount, months)
    remaining = total_amount - paid_amount
    return max(0, remaining)

