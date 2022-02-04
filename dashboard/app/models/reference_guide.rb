# == Schema Information
#
# Table name: reference_guides
#
#  id                        :bigint           not null, primary key
#  key                       :string(255)
#  course_version_id         :bigint
#  parent_reference_guide_id :bigint
#  display_name              :string(255)
#  content                   :text(65535)
#  position                  :integer
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#
# Indexes
#
#  index_reference_guides_on_course_version_id  (course_version_id)
#  index_reference_guides_on_key                (key)
#
class ReferenceGuide < ApplicationRecord
end
